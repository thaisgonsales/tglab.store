import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/store/product-card";
import { db } from "@/server/db";

type Params = { slug: string[] };

async function getCategory(slug: string) {
  try {
    return await db.category.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const leaf = slug.at(-1) ?? "";
  const category = await getCategory(leaf);
  return { title: category?.seoTitle ?? category?.name ?? "Categoría" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const leaf = slug.at(-1) ?? "";
  const category = await getCategory(leaf);
  if (!category) notFound();

  const products = await db.product
    .findMany({
      where: {
        status: "PUBLISHED",
        archivedAt: null,
        publishedAt: { not: null },
        categories: { some: { categoryId: category.id } },
      },
      orderBy: { publishedAt: "desc" },
      take: 48,
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
          select: { id: true, price: true, compareAtPrice: true, stock: true },
        },
      },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
      {category.description && (
        <p className="text-foreground-muted mt-2">{category.description}</p>
      )}

      {products.length === 0 ? (
        <p className="text-foreground-muted mt-8 text-sm">
          No hay productos en esta categoría todavía.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
