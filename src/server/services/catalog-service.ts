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

export const getBestSellers = cache(async (take = 8) => {
  try {
    const grouped = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: { paymentStatus: "PAID" },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: take * 2,
    });
    const ids = grouped
      .map((g) => g.productId)
      .filter((v): v is string => Boolean(v));
    if (ids.length === 0) return [];
    const products = await db.product.findMany({
      where: { ...PUBLISHED_WHERE, id: { in: ids } },
      select: cardSelect,
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    return products
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .slice(0, take);
  } catch {
    return [] as ProductCardData[];
  }
});

export type CatalogSort =
  | "recomendados"
  | "vendidos"
  | "nuevos"
  | "precio-asc"
  | "precio-desc"
  | "ofertas";

export type CatalogParams = {
  q?: string;
  categorySlug?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  /** slugs de valores de atributo (ej: color=negro,blanco) */
  attributeValueSlugs?: string[];
  onlyOffers?: boolean;
  sort?: CatalogSort;
  page?: number;
  perPage?: number;
};

export async function searchCatalog(params: CatalogParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(48, params.perPage ?? 12);

  const and: Prisma.ProductWhereInput[] = [PUBLISHED_WHERE];

  if (params.q) {
    and.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { shortDescription: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }
  if (params.categorySlug) {
    and.push({
      categories: {
        some: {
          category: {
            OR: [
              { slug: params.categorySlug },
              { parent: { slug: params.categorySlug } },
            ],
          },
        },
      },
    });
  }

  const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true };
  if (params.priceMin !== undefined || params.priceMax !== undefined) {
    variantWhere.price = {};
    if (params.priceMin !== undefined) variantWhere.price.gte = params.priceMin;
    if (params.priceMax !== undefined) variantWhere.price.lte = params.priceMax;
  }
  if (params.inStock) variantWhere.stock = { gt: 0 };
  if (params.onlyOffers) {
    // compareAtPrice > price
    and.push({
      variants: { some: { isActive: true, compareAtPrice: { not: null } } },
    });
  }
  if (params.attributeValueSlugs && params.attributeValueSlugs.length > 0) {
    for (const slug of params.attributeValueSlugs) {
      and.push({
        variants: {
          some: {
            isActive: true,
            attributeValues: { some: { attributeValue: { slug } } },
          },
        },
      });
    }
  }
  if (Object.keys(variantWhere).length > 1) {
    and.push({ variants: { some: variantWhere } });
  }

  const where: Prisma.ProductWhereInput = { AND: and };

  let orderBy:
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[] = { publishedAt: "desc" };
  if (params.sort === "nuevos") orderBy = { publishedAt: "desc" };
  else if (params.sort === "recomendados")
    orderBy = [{ isFeatured: "desc" }, { publishedAt: "desc" }];

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  // Ordenamientos por precio se resuelven en memoria (precio = min de variantes).
  let items = rows;
  if (params.sort === "precio-asc" || params.sort === "precio-desc") {
    const priceOf = (p: ProductCardData) =>
      Math.min(...p.variants.map((v) => v.price), Number.MAX_SAFE_INTEGER);
    items = [...rows].sort((a, b) =>
      params.sort === "precio-asc"
        ? priceOf(a) - priceOf(b)
        : priceOf(b) - priceOf(a),
    );
  }
  if (params.sort === "ofertas") {
    const disc = (p: ProductCardData) =>
      Math.max(
        0,
        ...p.variants.map((v) =>
          v.compareAtPrice && v.compareAtPrice > v.price
            ? (v.compareAtPrice - v.price) / v.compareAtPrice
            : 0,
        ),
      );
    items = [...rows].sort((a, b) => disc(b) - disc(a));
  }

  return {
    items,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Facetas de filtro: categorías, rango de precio y atributos presentes. */
export const getCatalogFacets = cache(async (categorySlug?: string) => {
  try {
    const productWhere: Prisma.ProductWhereInput = { ...PUBLISHED_WHERE };
    if (categorySlug) {
      productWhere.categories = {
        some: {
          category: {
            OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }],
          },
        },
      };
    }

    const [categories, priceAgg, attributeValues] = await Promise.all([
      db.category.findMany({
        where: {
          isActive: true,
          products: { some: { product: productWhere } },
        },
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
        select: { id: true, name: true, slug: true, parentId: true },
      }),
      db.productVariant.aggregate({
        where: { isActive: true, product: productWhere },
        _min: { price: true },
        _max: { price: true },
      }),
      db.attributeValue.findMany({
        where: {
          variantLinks: {
            some: { variant: { isActive: true, product: productWhere } },
          },
        },
        orderBy: { position: "asc" },
        select: {
          id: true,
          label: true,
          slug: true,
          hex: true,
          attribute: { select: { id: true, name: true, type: true } },
        },
      }),
    ]);

    const attributeMap = new Map<
      string,
      {
        id: string;
        name: string;
        type: "SELECT" | "COLOR";
        values: { label: string; slug: string; hex: string | null }[];
      }
    >();
    for (const v of attributeValues) {
      const entry = attributeMap.get(v.attribute.id) ?? {
        id: v.attribute.id,
        name: v.attribute.name,
        type: v.attribute.type,
        values: [],
      };
      entry.values.push({ label: v.label, slug: v.slug, hex: v.hex });
      attributeMap.set(v.attribute.id, entry);
    }

    return {
      categories,
      priceMin: priceAgg._min.price ?? 0,
      priceMax: priceAgg._max.price ?? 0,
      attributes: [...attributeMap.values()],
    };
  } catch {
    return {
      categories: [],
      priceMin: 0,
      priceMax: 0,
      attributes: [] as {
        id: string;
        name: string;
        type: "SELECT" | "COLOR";
        values: { label: string; slug: string; hex: string | null }[];
      }[],
    };
  }
});

export const getPublishedProductBySlug = cache(async (slug: string) => {
  try {
    return await db.product.findFirst({
      where: { ...PUBLISHED_WHERE, slug },
      include: {
        media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        categories: {
          include: { category: { include: { parent: true } } },
        },
        attributes: {
          include: { attribute: { include: { values: true } } },
          orderBy: { position: "asc" },
        },
        variants: {
          where: { isActive: true },
          include: { attributeValues: true, media: true },
          orderBy: { position: "asc" },
        },
        customFields: { orderBy: { position: "asc" } },
      },
    });
  } catch {
    return null;
  }
});

export const getRelatedProducts = cache(
  async (productId: string, categoryIds: string[], take = 4) => {
    if (categoryIds.length === 0) return [];
    try {
      return await db.product.findMany({
        where: {
          ...PUBLISHED_WHERE,
          id: { not: productId },
          categories: { some: { categoryId: { in: categoryIds } } },
        },
        select: cardSelect,
        orderBy: { publishedAt: "desc" },
        take,
      });
    } catch {
      return [] as ProductCardData[];
    }
  },
);
