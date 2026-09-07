import { notFound } from "next/navigation";

import { ProductEditor } from "@/components/admin/product-editor";
import {
  categoryOptions,
  getAdminProduct,
  listAttributes,
} from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, attributes] = await Promise.all([
    getAdminProduct(id),
    categoryOptions(),
    listAttributes(),
  ]);
  if (!product) notFound();

  const variant =
    product.variants.find((v) => v.optionsKey === "") ?? product.variants[0];
  const description =
    product.description &&
    typeof product.description === "object" &&
    "text" in product.description
      ? String((product.description as { text: unknown }).text)
      : "";

  const assignedAttributeIds = product.attributes.map((a) => a.attributeId);

  const variantRows = product.variants
    .filter((v) => v.optionsKey !== "")
    .map((v) => ({
      id: v.id,
      sku: v.sku ?? "",
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      weightGrams: v.weightGrams,
      isActive: v.isActive,
      hasSales: v._count.orderItems > 0,
      optionLabels: v.attributeValues.map((av) => ({
        attribute: av.attribute.name,
        value: av.attributeValue.label,
        hex: av.attributeValue.hex,
      })),
    }));

  return (
    <ProductEditor
      categories={categories}
      allAttributes={attributes.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        values: a.values.map((v) => ({
          id: v.id,
          label: v.label,
          hex: v.hex ?? "",
        })),
      }))}
      assignedAttributeIds={assignedAttributeIds}
      variants={variantRows}
      customFields={product.customFields.map((f) => ({
        id: f.id,
        label: f.label,
        helpText: f.helpText ?? "",
        type: f.type,
        isRequired: f.isRequired,
        maxLength: f.maxLength ?? undefined,
        options: Array.isArray(f.options) ? f.options.map(String) : [],
      }))}
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
