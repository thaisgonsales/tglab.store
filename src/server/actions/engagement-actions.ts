"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/server/auth/customer-session";
import { db } from "@/server/db";
import { getReviewableOrderItem } from "@/server/services/engagement-service";

const idSchema = z.string().trim().min(1).max(80);

export async function toggleFavorite(productIdInput: unknown) {
  const session = await requireCustomer();
  const parsed = idSchema.safeParse(productIdInput);
  if (!parsed.success)
    return { ok: false as const, error: "Producto inválido." };
  const productId = parsed.data;
  const product = await db.product.findFirst({
    where: { id: productId, status: "PUBLISHED", archivedAt: null },
    select: { slug: true },
  });
  if (!product) return { ok: false as const, error: "Producto no encontrado." };
  const key = {
    accountId_productId: { accountId: session.user.id, productId },
  };
  const existing = await db.productFavorite.findUnique({ where: key });
  if (existing) await db.productFavorite.delete({ where: key });
  else
    await db.productFavorite.create({
      data: { accountId: session.user.id, productId },
    });
  revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/cuenta/favoritos");
  return { ok: true as const, favorite: !existing };
}

const reviewSchema = z.object({
  orderItemId: idSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional(),
  content: z.string().trim().min(10).max(1200),
});

export async function submitVerifiedReview(input: unknown) {
  const session = await requireCustomer();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Revisa la calificación y escribe al menos 10 caracteres.",
    };
  const item = await getReviewableOrderItem(
    session.user.id,
    parsed.data.orderItemId,
  );
  if (!item?.productId)
    return {
      ok: false as const,
      error: "Esta compra no está habilitada para reseña.",
    };
  try {
    await db.productReview.create({
      data: {
        accountId: session.user.id,
        productId: item.productId,
        orderItemId: item.id,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        content: parsed.data.content,
      },
    });
  } catch {
    return {
      ok: false as const,
      error: "Ya publicaste una reseña para este producto.",
    };
  }
  const product = await db.product.findUnique({
    where: { id: item.productId },
    select: { slug: true },
  });
  if (product) revalidatePath(`/producto/${product.slug}`);
  revalidatePath("/cuenta/pedidos");
  return { ok: true as const };
}
