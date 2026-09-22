import "server-only";

import { db } from "@/server/db";

export async function isProductFavorite(accountId: string, productId: string) {
  return Boolean(
    await db.productFavorite.findUnique({
      where: { accountId_productId: { accountId, productId } },
      select: { productId: true },
    }),
  );
}

export async function listFavorites(accountId: string) {
  const rows = await db.productFavorite.findMany({
    where: { accountId, product: { status: "PUBLISHED", archivedAt: null } },
    orderBy: { createdAt: "desc" },
    select: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          media: {
            where: { type: "IMAGE" },
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: { url: true, alt: true, blurDataUrl: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              price: true,
              compareAtPrice: true,
              stock: true,
            },
          },
        },
      },
    },
  });
  return rows.map((row) => row.product);
}

export async function listPublishedReviews(productId: string) {
  const reviews = await db.productReview.findMany({
    where: { productId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      rating: true,
      title: true,
      content: true,
      createdAt: true,
      account: { select: { firstName: true, name: true } },
    },
  });
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  return { reviews, average, count: reviews.length };
}

export async function getReviewableOrderItem(
  accountId: string,
  orderItemId: string,
) {
  return db.orderItem.findFirst({
    where: {
      id: orderItemId,
      productId: { not: null },
      order: { accountId, paymentStatus: "PAID" },
      review: null,
    },
    select: { id: true, productId: true, productName: true },
  });
}
