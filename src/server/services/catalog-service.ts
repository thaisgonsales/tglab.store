import "server-only";

import { cache } from "react";

import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Lecturas del catálogo para la tienda. Solo productos publicados y no
 * archivados. La administración usa consultas propias (sin estos filtros).
 */

const PUBLISHED_WHERE = {
  status: "PUBLISHED",
  archivedAt: null,
  publishedAt: { not: null },
} satisfies Prisma.ProductWhereInput;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  media: {
    where: { type: "IMAGE" as const },
    orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }],
    take: 1,
    select: { url: true, alt: true, blurDataUrl: true },
  },
  variants: {
    where: { isActive: true },
    select: { price: true, compareAtPrice: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{
  select: typeof cardSelect;
}>;

export const listPublishedProducts = cache(
  async (opts: { take?: number; featured?: boolean } = {}) => {
    try {
      return await db.product.findMany({
        where: {
          ...PUBLISHED_WHERE,
          ...(opts.featured ? { isFeatured: true } : {}),
        },
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        take: opts.take ?? 12,
      });
    } catch {
      return [] as ProductCardData[];
    }
  },
);

export const getPublishedProductBySlug = cache(async (slug: string) => {
  try {
    return await db.product.findFirst({
      where: { ...PUBLISHED_WHERE, slug },
      include: {
        media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        categories: { include: { category: true } },
        attributes: {
          include: { attribute: { include: { values: true } } },
          orderBy: { position: "asc" },
        },
        variants: {
          where: { isActive: true },
          include: { attributeValues: true },
          orderBy: { position: "asc" },
        },
        customFields: { orderBy: { position: "asc" } },
      },
    });
  } catch {
    return null;
  }
});
