import "server-only";

import { toCLP } from "@/lib/money";
import type { Coupon, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type CouponLine = {
  productId: string | null;
  lineTotal: number;
};

export type CouponEvaluation =
  | { valid: false; reason: string }
  | {
      valid: true;
      coupon: Coupon;
      /** Descuento sobre el subtotal (0 para FREE_SHIPPING). */
      discount: number;
      freeShipping: boolean;
    };

/**
 * Valida un cupón contra el carrito y devuelve el descuento aplicable.
 * Reglas: vigencia, compra mínima, usos totales, usos por cliente, y
 * restricción por productos/categorías (el descuento aplica solo sobre las
 * líneas elegibles).
 */
export async function evaluateCoupon(
  codeRaw: string,
  ctx: { subtotal: number; lines: CouponLine[]; customerEmail?: string },
): Promise<CouponEvaluation> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Ingresa un código." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return { valid: false, reason: "El cupón no existe o no está activo." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, reason: "El cupón todavía no está vigente." };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, reason: "El cupón está vencido." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: "El cupón alcanzó su límite de usos." };
  }
  if (coupon.minSubtotal !== null && ctx.subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      reason: `Compra mínima de ${coupon.minSubtotal} para este cupón.`,
    };
  }
  if (coupon.maxUsesPerCustomer !== null && ctx.customerEmail) {
    const used = await db.couponUse.count({
      where: {
        couponId: coupon.id,
        customerEmail: ctx.customerEmail.toLowerCase(),
      },
    });
    if (used >= coupon.maxUsesPerCustomer) {
      return { valid: false, reason: "Ya usaste este cupón." };
    }
  }

  // Subtotal elegible según restricción de productos/categorías.
  let eligibleSubtotal = ctx.subtotal;
  const restricted =
    coupon.appliesToProductIds.length > 0 ||
    coupon.appliesToCategoryIds.length > 0;

  if (restricted) {
    const productIds = ctx.lines
      .map((l) => l.productId)
      .filter((v): v is string => Boolean(v));
    const categoryByProduct = new Map<string, string[]>();
    if (coupon.appliesToCategoryIds.length > 0 && productIds.length > 0) {
      const links = await db.productCategory.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, categoryId: true },
      });
      for (const link of links) {
        const arr = categoryByProduct.get(link.productId) ?? [];
        arr.push(link.categoryId);
        categoryByProduct.set(link.productId, arr);
      }
    }
    const eligibleSet = new Set(coupon.appliesToProductIds);
    eligibleSubtotal = ctx.lines.reduce((acc, line) => {
      if (!line.productId) return acc;
      const byProduct = eligibleSet.has(line.productId);
      const byCategory = (categoryByProduct.get(line.productId) ?? []).some(
        (c) => coupon.appliesToCategoryIds.includes(c),
      );
      return byProduct || byCategory ? acc + line.lineTotal : acc;
    }, 0);

    if (eligibleSubtotal <= 0) {
      return {
        valid: false,
        reason: "El cupón no aplica a los productos de tu carrito.",
      };
    }
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { valid: true, coupon, discount: 0, freeShipping: true };
  }
  if (coupon.type === "PERCENT") {
    const discount = toCLP(
      (eligibleSubtotal * Math.min(coupon.value, 100)) / 100,
    );
    return { valid: true, coupon, discount, freeShipping: false };
  }
  // FIXED
  const discount = Math.min(coupon.value, eligibleSubtotal);
  return { valid: true, coupon, discount, freeShipping: false };
}

/** Registra el uso del cupón dentro de la transacción de creación del pedido. */
export async function recordCouponUse(
  tx: Prisma.TransactionClient,
  input: {
    couponId: string;
    orderId: string;
    customerEmail: string;
    amountDiscounted: number;
  },
) {
  await tx.couponUse.create({
    data: {
      couponId: input.couponId,
      orderId: input.orderId,
      customerEmail: input.customerEmail.toLowerCase(),
      amountDiscounted: input.amountDiscounted,
    },
  });
  await tx.coupon.update({
    where: { id: input.couponId },
    data: { usedCount: { increment: 1 } },
  });
}
