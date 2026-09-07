import { notFound } from "next/navigation";

import { ProductEditor } from "@/components/admin/product-editor";
import {
  categoryOptions,
  getAdminProduct,
} from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    categoryOptions(),
  ]);
  if (!product) notFound();

  const variant = product.variants[0];
  const description =
    product.description &&
    typeof product.description === "object" &&
    "text" in product.description
      ? String((product.description as { text: unknown }).text)
      : "";

  return (
    <ProductEditor
      categories={categories}
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku ?? "",
        type: product.type,
        status: product.status,
        isFeatured: product.isFeatured,
        shortDescription: product.shortDescription ?? "",
        description,
        material: product.material ?? "",
        dimensions: product.dimensions ?? "",
        weightGrams: product.weightGrams ?? undefined,
        packageWeightGrams: product.packageWeightGrams ?? undefined,
        allowsShipping: product.allowsShipping,
        allowsPickup: product.allowsPickup,
        lowStockThreshold: product.lowStockThreshold ?? undefined,
        lastUnitsThreshold: product.lastUnitsThreshold ?? undefined,
        seoTitle: product.seoTitle ?? "",
        seoDescription: product.seoDescription ?? "",
        price: variant?.price ?? 0,
        compareAtPrice: variant?.compareAtPrice ?? null,
        stock: variant?.stock ?? 0,
        categoryIds: product.categories.map((c) => c.categoryId),
        primaryCategoryId:
          product.categories.find((c) => c.isPrimary)?.categoryId ??
          product.categories[0]?.categoryId,
      }}
      media={product.media.map((m) => ({
        id: m.id,
        type: m.type,
        provider: m.provider,
        url: m.url,
        posterUrl: m.posterUrl,
        alt: m.alt,
        isPrimary: m.isPrimary,
      }))}
    />
  );
}
