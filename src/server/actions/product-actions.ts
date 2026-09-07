"use server";

import { revalidatePath } from "next/cache";

import {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "@/lib/schemas/product";
import { slugify } from "@/lib/slug";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { deleteStored } from "@/server/upload/upload-service";
import { recordMovement } from "@/server/services/inventory-service";

function revalidateProduct(id?: string) {
  revalidatePath("/admin/productos");
  if (id) revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/productos");
  revalidatePath("/", "layout");
}

async function uniqueProductSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "producto";
  let slug = root;
  let i = 2;
  for (;;) {
    const existing = await db.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

export async function createProduct(input: ProductCreateInput) {
  return staffAction(async () => {
    const data = productCreateSchema.parse(input);
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category)
      throw new ActionError("La categoría seleccionada no existe.");
    if (data.compareAtPrice !== null && data.compareAtPrice <= data.price) {
      throw new ActionError(
        "El precio anterior debe ser mayor que el precio actual.",
      );
    }

    const slug = await uniqueProductSlug(data.name);
    const product = await db.product.create({
      data: {
        name: data.name,
        slug,
        type: "SIMPLE",
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        categories: {
          create: { categoryId: data.categoryId, isPrimary: true },
        },
        variants: {
          create: {
            optionsKey: "",
            price: data.price,
            compareAtPrice: data.compareAtPrice,
            stock: data.stock,
            position: 0,
          },
        },
      },
      include: { variants: true },
    });

    if (data.stock > 0 && product.variants[0]) {
      await recordMovement(db, {
        variantId: product.variants[0].id,
        type: "RESTOCK",
        quantityDelta: data.stock,
        stockBefore: 0,
        stockAfter: data.stock,
        reason: "Stock inicial",
      });
    }

    revalidateProduct(product.id);
    return { id: product.id };
  });
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  return staffAction(async (session) => {
    const data = productUpdateSchema.parse(input);
    const product = await db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: "asc" } }, categories: true },
    });
    if (!product) throw new ActionError("El producto no existe.");
    if (product.type === "VARIABLE") {
      throw new ActionError(
        "Este producto tiene variantes; edita precio y stock desde la sección de variantes (Fase 4).",
      );
    }

    const defaultVariant = product.variants[0];
    if (!defaultVariant)
      throw new ActionError("El producto no tiene variante base.");

    if (data.compareAtPrice !== null && data.compareAtPrice <= data.price) {
      throw new ActionError(
        "El precio anterior debe ser mayor que el precio actual.",
      );
    }

    const categoryRows = await db.category.findMany({
      where: { id: { in: data.categoryIds } },
      select: { id: true },
    });
    if (categoryRows.length !== data.categoryIds.length) {
      throw new ActionError("Alguna categoría seleccionada no existe.");
    }
    const primaryId =
      data.primaryCategoryId &&
      data.categoryIds.includes(data.primaryCategoryId)
        ? data.primaryCategoryId
        : data.categoryIds[0]!;

    const slug =
      data.slug !== product.slug
        ? await uniqueProductSlug(data.slug, id)
        : product.slug;

    const willPublish =
      data.status === "PUBLISHED" && product.status !== "PUBLISHED";

    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug,
          sku: data.sku || null,
          shortDescription: data.shortDescription || null,
          description: data.description
            ? { text: data.description }
            : undefined,
          material: data.material || null,
          dimensions: data.dimensions || null,
          weightGrams: data.weightGrams ?? null,
          packageWeightGrams: data.packageWeightGrams ?? null,
          allowsShipping: data.allowsShipping,
          allowsPickup: data.allowsPickup,
          lowStockThreshold: data.lowStockThreshold ?? null,
          lastUnitsThreshold: data.lastUnitsThreshold ?? null,
          status: data.status,
          isFeatured: data.isFeatured,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          publishedAt: willPublish ? new Date() : product.publishedAt,
        },
      });

      // Sincroniza categorías
      await tx.productCategory.deleteMany({
        where: { productId: id, categoryId: { notIn: data.categoryIds } },
      });
      for (const categoryId of data.categoryIds) {
        await tx.productCategory.upsert({
          where: { productId_categoryId: { productId: id, categoryId } },
          create: {
            productId: id,
            categoryId,
            isPrimary: categoryId === primaryId,
          },
          update: { isPrimary: categoryId === primaryId },
        });
      }

      // Precio de la variante base
      await tx.productVariant.update({
        where: { id: defaultVariant.id },
        data: {
          sku: data.sku || null,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          weightGrams: data.weightGrams ?? null,
        },
      });

      // Ajuste de stock con registro
      if (data.stock !== defaultVariant.stock) {
        await tx.productVariant.update({
          where: { id: defaultVariant.id },
          data: { stock: data.stock },
        });
        await recordMovement(tx, {
          variantId: defaultVariant.id,
          type: data.stock > defaultVariant.stock ? "RESTOCK" : "ADJUSTMENT",
          quantityDelta: data.stock - defaultVariant.stock,
          stockBefore: defaultVariant.stock,
          stockAfter: data.stock,
          reason: "Ajuste manual desde el panel",
          adminUserId: session.user.id,
        });
      }
    });

    revalidateProduct(id);
    return { id, slug };
  });
}

export async function setProductStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "HIDDEN",
) {
  return staffAction(async () => {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new ActionError("El producto no existe.");
    await db.product.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === "PUBLISHED" && !product.publishedAt
            ? new Date()
            : product.publishedAt,
      },
    });
    revalidateProduct(id);
    return null;
  });
}

export async function duplicateProduct(id: string) {
  return staffAction(async () => {
    const source = await db.product.findUnique({
      where: { id },
      include: {
        categories: true,
        variants: { include: { attributeValues: true } },
        attributes: true,
        media: true,
        customFields: true,
      },
    });
    if (!source) throw new ActionError("El producto no existe.");

    const slug = await uniqueProductSlug(`${source.name} copia`);
    const copy = await db.product.create({
      data: {
        name: `${source.name} (copia)`,
        slug,
        type: source.type,
        status: "DRAFT",
        shortDescription: source.shortDescription,
        description: source.description ?? undefined,
        material: source.material,
        dimensions: source.dimensions,
        weightGrams: source.weightGrams,
        packageWeightGrams: source.packageWeightGrams,
        allowsShipping: source.allowsShipping,
        allowsPickup: source.allowsPickup,
        lowStockThreshold: source.lowStockThreshold,
        lastUnitsThreshold: source.lastUnitsThreshold,
        categories: {
          create: source.categories.map((c) => ({
            categoryId: c.categoryId,
            isPrimary: c.isPrimary,
          })),
        },
        attributes: {
          create: source.attributes.map((a) => ({
            attributeId: a.attributeId,
            position: a.position,
          })),
        },
        variants: {
          create: source.variants.map((v) => ({
            optionsKey: v.optionsKey,
            sku: v.sku ? `${v.sku}-COPIA` : null,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: 0,
            weightGrams: v.weightGrams,
            isActive: v.isActive,
            position: v.position,
            attributeValues: {
              create: v.attributeValues.map((av) => ({
                attributeId: av.attributeId,
                attributeValueId: av.attributeValueId,
              })),
            },
          })),
        },
        customFields: {
          create: source.customFields.map((f) => ({
            key: f.key,
            label: f.label,
            helpText: f.helpText,
            type: f.type,
            isRequired: f.isRequired,
            maxLength: f.maxLength,
            options: f.options ?? undefined,
            position: f.position,
          })),
        },
      },
    });

    // Copia de media (comparte los mismos archivos; no duplica en storage)
    for (const m of source.media) {
      await db.productMedia.create({
        data: {
          productId: copy.id,
          type: m.type,
          provider: m.provider,
          url: m.url,
          storageKey: null, // no compartir la clave para no borrar el archivo original
          posterUrl: m.posterUrl,
          alt: m.alt,
          width: m.width,
          height: m.height,
          blurDataUrl: m.blurDataUrl,
          position: m.position,
          isPrimary: m.isPrimary,
        },
      });
    }

    revalidateProduct(copy.id);
    return { id: copy.id };
  });
}

export async function archiveProduct(id: string, archived: boolean) {
  return staffAction(async () => {
    await db.product.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    });
    revalidateProduct(id);
    return null;
  });
}

export async function deleteProduct(id: string) {
  return staffAction(async () => {
    const orderItems = await db.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      // Nunca borrar productos con historial de ventas: se archiva.
      await db.product.update({
        where: { id },
        data: { archivedAt: new Date(), status: "HIDDEN" },
      });
      revalidateProduct(id);
      throw new ActionError(
        "Este producto tiene ventas asociadas: se archivó en lugar de eliminarse (los pedidos históricos se conservan).",
      );
    }

    const media = await db.productMedia.findMany({
      where: { productId: id },
      select: { storageKey: true },
    });
    await db.product.delete({ where: { id } });
    for (const m of media) await deleteStored(m.storageKey);

    revalidateProduct();
    return null;
  });
}
