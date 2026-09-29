import "server-only";

import { calculateReviewSummary } from "@/lib/review-summary";
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
    where: { productId, status: { in: ["APPROVED", "PUBLISHED"] } },
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
  return { reviews, ...calculateReviewSummary(reviews) };
}

export async function listHomeReviews(take = 6) {
  return db.productReview.findMany({
    where: {
      status: { in: ["APPROVED", "PUBLISHED"] },
      product: { status: "PUBLISHED", archivedAt: null },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      rating: true,
      title: true,
      content: true,
      createdAt: true,
      account: { select: { firstName: true, name: true } },
      product: { select: { name: true, slug: true } },
    },
  });
}

export async function listReviewsForAdmin(status?: string) {
  const allowed = ["PENDING", "APPROVED", "REJECTED"] as const;
  const selected = allowed.find((value) => value === status);
  return db.productReview.findMany({
    where: selected ? { status: selected } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      title: true,
      content: true,
      status: true,
      createdAt: true,
      account: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
  });
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
