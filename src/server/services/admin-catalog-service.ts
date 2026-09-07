import "server-only";

import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/** Lecturas para el panel: sin filtro de "publicado". */

export async function listAdminCategories() {
  return db.category.findMany({
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true } },
    },
  });
}

export async function getAdminCategory(id: string) {
  return db.category.findUnique({ where: { id } });
}

export async function listAttributes() {
  return db.attribute.findMany({
    orderBy: { position: "asc" },
    include: {
      values: { orderBy: { position: "asc" } },
      _count: { select: { products: true } },
    },
  });
}

export async function getAttribute(id: string) {
  return db.attribute.findUnique({
    where: { id },
    include: { values: { orderBy: { position: "asc" } } },
  });
}

export type AdminProductListParams = {
  q?: string;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  categoryId?: string;
  page?: number;
  perPage?: number;
};

export async function listAdminProducts(params: AdminProductListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, params.perPage ?? 20);

  const where: Prisma.ProductWhereInput = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { sku: { contains: params.q, mode: "insensitive" } },
      { slug: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status === "ARCHIVED") {
    where.archivedAt = { not: null };
  } else {
    where.archivedAt = null;
    if (params.status) where.status = params.status;
  }
  if (params.categoryId) {
    where.categories = { some: { categoryId: params.categoryId } };
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        isFeatured: true,
        type: true,
        archivedAt: true,
        updatedAt: true,
        media: {
          where: { type: "IMAGE" },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
          select: { url: true },
        },
        variants: { select: { price: true, stock: true } },
        categories: {
          where: { isPrimary: true },
          take: 1,
          select: { category: { select: { name: true } } },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      media: { orderBy: { position: "asc" } },
      variants: {
        orderBy: { position: "asc" },
        include: {
          attributeValues: {
            include: { attributeValue: true, attribute: true },
          },
        },
      },
      attributes: {
        orderBy: { position: "asc" },
        include: { attribute: { include: { values: true } } },
      },
      customFields: { orderBy: { position: "asc" } },
    },
  });
}

/** Todas las categorías activas como opciones planas (con indentación por nivel). */
export async function categoryOptions() {
  const cats = await db.category.findMany({
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
    select: { id: true, name: true, parentId: true, isActive: true },
  });
  const byParent = new Map<string | null, typeof cats>();
  for (const c of cats) {
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }
  const out: { id: string; label: string; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push({ id: c.id, label: c.name, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
