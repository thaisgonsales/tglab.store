import "server-only";

import { cookies } from "next/headers";
import { nanoid } from "nanoid";

import { CART_COOKIE_NAME, CART_TTL_DAYS } from "@/config/constants";
import { db } from "@/server/db";
import { discountPercent } from "@/lib/money";

/**
 * Servicio de carrito (server-side, persistente por cookie).
 * Los precios NUNCA se guardan en el carrito: se recalculan desde la BD en
 * cada lectura. El total definitivo lo fija el servidor otra vez en el checkout.
 */

function ttlDate(): Date {
  return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Devuelve el token del carrito de la cookie (sin crear nada). */
export async function getCartToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE_NAME)?.value ?? null;
}

/**
 * Devuelve el carrito actual creándolo si hace falta. Debe llamarse desde un
 * contexto donde se pueden escribir cookies (Server Action / route handler).
 */
export async function getOrCreateCart(): Promise<{
  id: string;
  token: string;
}> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE_NAME)?.value;

  if (existing) {
    const cart = await db.cart.findUnique({ where: { token: existing } });
    if (cart) {
      await db.cart.update({
        where: { id: cart.id },
        data: { expiresAt: ttlDate() },
      });
      return { id: cart.id, token: cart.token };
    }
  }

  const token = nanoid(32);
  const cart = await db.cart.create({
    data: { token, expiresAt: ttlDate() },
  });
  store.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });
  return { id: cart.id, token };
}

export async function getCartItemCount(): Promise<number> {
  try {
    const token = await getCartToken();
    if (!token) return 0;
    const result = await db.cartItem.aggregate({
      where: { cart: { token } },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  } catch {
    return 0;
  }
}

export type CartLine = {
  id: string;
  quantity: number;
  productId: string | null;
  productName: string;
  productSlug: string | null;
  variantId: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  compareAtUnitPrice: number | null;
  discountPercent: number;
  lineTotal: number;
  maxStock: number;
  available: boolean;
  customizations: { label: string; value: string }[];
};

export type CartView = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  compareAtSubtotal: number;
  hasUnavailable: boolean;
};

const EMPTY: CartView = {
  lines: [],
  itemCount: 0,
  subtotal: 0,
  compareAtSubtotal: 0,
  hasUnavailable: false,
};

/** Lee el carrito y recalcula precios/disponibilidad desde la BD. */
export async function getCartView(): Promise<CartView> {
  try {
    const token = await getCartToken();
    if (!token) return EMPTY;

    const cart = await db.cart.findUnique({
      where: { token },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                    archivedAt: true,
                    media: {
                      where: { type: "IMAGE" },
                      orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                      take: 1,
                      select: { url: true },
                    },
                  },
                },
                attributeValues: {
                  include: { attribute: true, attributeValue: true },
                },
              },
            },
          },
        },
      },
    });
    if (!cart) return EMPTY;

    const lines: CartLine[] = cart.items.map((item) => {
      const v = item.variant;
      const published =
        v.product.status === "PUBLISHED" && v.product.archivedAt === null;
      const available = published && v.isActive && v.stock >= item.quantity;
      const label =
        v.attributeValues.map((av) => av.attributeValue.label).join(" / ") ||
        null;
      const custom = Array.isArray(item.customizations)
        ? (item.customizations as { label: string; value: string }[])
        : [];

      return {
        id: item.id,
        quantity: item.quantity,
        productId: v.product.id,
        productName: v.product.name,
        productSlug: v.product.slug,
        variantId: v.id,
        variantLabel: label,
        imageUrl: v.product.media[0]?.url ?? null,
        unitPrice: v.price,
        compareAtUnitPrice:
          v.compareAtPrice && v.compareAtPrice > v.price
            ? v.compareAtPrice
            : null,
        discountPercent: v.compareAtPrice
          ? discountPercent(v.compareAtPrice, v.price)
          : 0,
        lineTotal: v.price * item.quantity,
        maxStock: v.stock,
        available,
        customizations: custom,
      };
    });

    const subtotal = lines
      .filter((l) => l.available)
      .reduce((a, l) => a + l.lineTotal, 0);
    const compareAtSubtotal = lines
      .filter((l) => l.available)
      .reduce(
        (a, l) => a + (l.compareAtUnitPrice ?? l.unitPrice) * l.quantity,
        0,
      );

    return {
      lines,
      itemCount: lines.reduce((a, l) => a + l.quantity, 0),
      subtotal,
      compareAtSubtotal,
      hasUnavailable: lines.some((l) => !l.available),
    };
  } catch {
    return EMPTY;
  }
}
