import "server-only";

import { discountPercent } from "@/lib/money";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { evaluateCoupon } from "@/server/services/coupon-service";
import {
  getShippingOptions,
  resolveShippingRate,
  type ShippingOption,
} from "@/server/services/shipping-service";

/**
 * Fuente única de verdad de los montos. El frontend NUNCA envía precios: envía
 * el token del carrito y el destino, y este servicio recalcula todo desde la BD.
 * Se usa tanto para mostrar el resumen del checkout como para crear el pedido.
 */

export type QuoteLine = {
  cartItemId: string;
  variantId: string;
  productId: string | null;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  compareAtUnitPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: boolean;
  maxStock: number;
  customizations: { key: string; label: string; value: string }[];
};

export type AppliedCoupon = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  discount: number;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  fulfillmentMethod: "SHIPPING" | "PICKUP";
  hasUnavailableLines: boolean;
  isEmpty: boolean;
};

export type QuoteInput = {
  cartToken: string;
  fulfillmentMethod: "SHIPPING" | "PICKUP";
  region?: string;
  comuna?: string;
  shippingRateId?: string;
  couponCode?: string;
  customerEmail?: string;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              status: true,
              archivedAt: true,
              weightGrams: true,
              packageWeightGrams: true,
              media: {
                where: { type: "IMAGE" as const },
                orderBy: [
                  { isPrimary: "desc" as const },
                  { position: "asc" as const },
                ],
                take: 1,
                select: { url: true },
              },
            },
          },
          attributeValues: { include: { attributeValue: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

function emptyQuote(fulfillmentMethod: "SHIPPING" | "PICKUP"): Quote {
  return {
    lines: [],
    itemCount: 0,
    subtotal: 0,
    discountTotal: 0,
    shippingTotal: 0,
    grandTotal: 0,
    shippingOptions: [],
    selectedShipping: null,
    appliedCoupon: null,
    couponError: null,
    fulfillmentMethod,
    hasUnavailableLines: false,
    isEmpty: true,
  };
}

export async function quoteCart(input: QuoteInput): Promise<Quote> {
  const cart = await db.cart.findUnique({
    where: { token: input.cartToken },
    include: cartInclude,
  });
  if (!cart || cart.items.length === 0) {
    return emptyQuote(input.fulfillmentMethod);
  }

  const lines: QuoteLine[] = cart.items.map((item) => {
    const v = item.variant;
    const freeStock = v.stock - v.reservedStock;
    const published =
      v.product.status === "PUBLISHED" && v.product.archivedAt === null;
    const available = published && v.isActive && freeStock >= item.quantity;
    const label =
      v.attributeValues.map((av) => av.attributeValue.label).join(" / ") ||
      null;
    const custom = Array.isArray(item.customizations)
      ? (item.customizations as { key: string; label: string; value: string }[])
      : [];

    return {
      cartItemId: item.id,
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      variantLabel: label,
      sku: v.sku,
      imageUrl: v.product.media[0]?.url ?? null,
      unitPrice: v.price,
      compareAtUnitPrice:
        v.compareAtPrice && v.compareAtPrice > v.price
          ? v.compareAtPrice
          : null,
      quantity: item.quantity,
      lineTotal: v.price * item.quantity,
      available,
      maxStock: freeStock,
      customizations: custom,
    };
  });

  const payableLines = lines.filter((l) => l.available);
  const subtotal = payableLines.reduce((a, l) => a + l.lineTotal, 0);
  const itemCount = payableLines.reduce((a, l) => a + l.quantity, 0);

  // --- Cupón ---
  let appliedCoupon: AppliedCoupon | null = null;
  let couponError: string | null = null;
  let discountTotal = 0;
  let freeShipping = false;
  if (input.couponCode) {
    const evaluation = await evaluateCoupon(input.couponCode, {
      subtotal,
      lines: payableLines.map((l) => ({
        productId: l.productId,
        lineTotal: l.lineTotal,
      })),
      customerEmail: input.customerEmail,
    });
    if (evaluation.valid) {
      discountTotal = evaluation.discount;
      freeShipping = evaluation.freeShipping;
      appliedCoupon = {
        code: evaluation.coupon.code,
        type: evaluation.coupon.type,
        discount: discountTotal,
      };
    } else {
      couponError = evaluation.reason;
    }
  }

  // --- Despacho ---
  let shippingOptions: ShippingOption[] = [];
  let selectedShipping: ShippingOption | null = null;
  let shippingTotal = 0;

  if (
    input.fulfillmentMethod === "SHIPPING" &&
    input.region &&
    input.comuna &&
    payableLines.length > 0
  ) {
    const weightGrams = cart.items.reduce((acc, item) => {
      const w =
        item.variant.weightGrams ??
        item.variant.product.packageWeightGrams ??
        item.variant.product.weightGrams ??
        0;
      return acc + w * item.quantity;
    }, 0);

    const ctx = {
      region: input.region,
      comuna: input.comuna,
      subtotal,
      weightGrams,
    };
    shippingOptions = await getShippingOptions(ctx);

    if (input.shippingRateId) {
      selectedShipping = await resolveShippingRate(input.shippingRateId, ctx);
    }
    if (!selectedShipping && shippingOptions.length > 0) {
      selectedShipping = shippingOptions[0]!;
    }
    if (selectedShipping) {
      shippingTotal = freeShipping ? 0 : selectedShipping.price;
      if (freeShipping && appliedCoupon) {
        appliedCoupon.discount = selectedShipping.price;
        discountTotal = 0; // FREE_SHIPPING no descuenta del subtotal
      }
    }
  }

  const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal);

  return {
    lines,
    itemCount,
    subtotal,
    discountTotal,
    shippingTotal,
    grandTotal,
    shippingOptions,
    selectedShipping,
    appliedCoupon,
    couponError,
    fulfillmentMethod: input.fulfillmentMethod,
    hasUnavailableLines: lines.some((l) => !l.available),
    isEmpty: payableLines.length === 0,
  };
}

export { discountPercent };
