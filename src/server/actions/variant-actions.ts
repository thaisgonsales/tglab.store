"use server";

import { revalidatePath } from "next/cache";

import { slugify } from "@/lib/slug";
import type { z } from "zod";

import {
  generateVariantsSchema,
  setAttributesSchema,
  variantUpdateSchema,
} from "@/lib/schemas/variant";
import { buildOptionsKey, cartesian } from "@/lib/variant-key";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { recordMovement } from "@/server/services/inventory-service";

function revalidate(productId: string) {
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/productos");
  revalidatePath("/", "layout");
}

/** Define qué atributos usa el producto (Color, Modelo…). */
export async function setProductAttributes(input: {
  productId: string;
  attributeIds: string[];
}) {
  return staffAction(async () => {
    const { productId, attributeIds } = setAttributesSchema.parse(input);
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { variants: { include: { orderItems: { take: 1 } } } },
    });
    if (!product) throw new ActionError("El producto no existe.");

    const hasSales = product.variants.some((v) => v.orderItems.length > 0);
    const current = await db.productAttribute.findMany({
      where: { productId },
    });
    const currentIds = current.map((a) => a.attributeId);
    const removed = currentIds.filter((id) => !attributeIds.includes(id));

    if (hasSales && removed.length > 0) {
      throw new ActionError(
        "No se pueden quitar atributos de un producto con ventas.",
      );
    }

    if (attributeIds.length > 0) {
      const found = await db.attribute.count({
        where: { id: { in: attributeIds } },
      });
      if (found !== attributeIds.length) {
        throw new ActionError("Algún atributo seleccionado no existe.");
      }
    }

    await db.$transaction(async (tx) => {
      await tx.productAttribute.deleteMany({
        where: { productId, attributeId: { in: removed } },
      });
      for (let i = 0; i < attributeIds.length; i++) {
        const attributeId = attributeIds[i]!;
        await tx.productAttribute.upsert({
          where: { productId_attributeId: { productId, attributeId } },
          create: { productId, attributeId, position: i },
          update: { position: i },
        });
      }

      if (attributeIds.length === 0) {
        // Vuelve a producto simple: colapsa a una variante base.
        if (hasSales) {
          throw new ActionError(
            "No se puede volver a producto simple: tiene ventas.",
          );
        }
        const keep = product.variants[0];
        await tx.productVariant.deleteMany({
          where: { productId, id: { not: keep?.id ?? "" } },
        });
        if (keep) {
          await tx.productVariant.update({
            where: { id: keep.id },
            data: { optionsKey: "" },
          });
          await tx.variantAttributeValue.deleteMany({
            where: { variantId: keep.id },
          });
        }
        await tx.product.update({
          where: { id: productId },
          data: { type: "SIMPLE" },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { type: "VARIABLE" },
        });
      }
    });

    revalidate(productId);
    return null;
  });
}

/** Genera (o completa) las combinaciones de variantes a partir de la selección. */
export async function generateVariants(input: {
  productId: string;
  selection: { attributeId: string; valueIds: string[] }[];
}) {
  return staffAction(async () => {
    const { productId, selection } = generateVariantsSchema.parse(input);
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        attributes: true,
        variants: { orderBy: { position: "asc" } },
      },
    });
    if (!product) throw new ActionError("El producto no existe.");

    const assigned = new Set(product.attributes.map((a) => a.attributeId));
    for (const s of selection) {
      if (!assigned.has(s.attributeId)) {
        throw new ActionError(
          "La selección incluye un atributo no asignado al producto.",
        );
      }
    }

    // Orden estable por posición del atributo en el producto.
    const ordered = product.attributes
      .filter((a) => selection.some((s) => s.attributeId === a.attributeId))
      .map((a) => ({
        attributeId: a.attributeId,
        valueIds: selection.find((s) => s.attributeId === a.attributeId)!
          .valueIds,
      }));

    const values = await db.attributeValue.findMany({
      where: { id: { in: ordered.flatMap((o) => o.valueIds) } },
      select: { id: true, attributeId: true, slug: true },
    });
    const valueAttr = new Map(values.map((v) => [v.id, v.attributeId]));
    const valueSlugById = new Map(values.map((v) => [v.id, v.slug]));
    for (const o of ordered) {
      for (const vid of o.valueIds) {
        if (valueAttr.get(vid) !== o.attributeId) {
          throw new ActionError("Un valor no corresponde a su atributo.");
        }
      }
    }

    const combos = cartesian(ordered.map((o) => o.valueIds));
    if (combos.length > 200) {
      throw new ActionError(
        `Se generarían ${combos.length} combinaciones (máximo 200). Reduce la selección.`,
      );
    }

    const existingKeys = new Set(product.variants.map((v) => v.optionsKey));
    const basePrice = product.variants[0]?.price ?? 0;
    const baseCompare = product.variants[0]?.compareAtPrice ?? null;

    const toCreate = combos
      .map((combo) => ({ combo, key: buildOptionsKey(combo) }))
      .filter(({ key }) => !existingKeys.has(key));

    if (toCreate.length === 0) {
      revalidate(productId);
      return { created: 0 };
    }

    const skuBase = (
      product.sku ||
      slugify(product.name) ||
      "SKU"
    ).toUpperCase();

    await db.$transaction(async (tx) => {
      // Si el producto todavía tenía la variante "simple" vacía (optionsKey ""),
      // se elimina al aparecer combinaciones reales (salvo que tenga ventas).
      const emptySimple = product.variants.find((v) => v.optionsKey === "");
      let startPos = product.variants.length;
      if (emptySimple) {
        const used = await tx.orderItem.count({
          where: { variantId: emptySimple.id },
        });
        if (used === 0) {
          await tx.productVariant.delete({ where: { id: emptySimple.id } });
          startPos -= 1;
        }
      }

      for (let i = 0; i < toCreate.length; i++) {
        const { combo, key } = toCreate[i]!;
        const suffix = combo
          .map((id) => valueSlugById.get(id) ?? id.slice(-4))
          .join("-")
          .toUpperCase();
        await tx.productVariant.create({
          data: {
            productId,
            optionsKey: key,
            sku: `${skuBase}-${suffix}`.slice(0, 60),
            price: basePrice,
            compareAtPrice: baseCompare,
            stock: 0,
            position: startPos + i,
            attributeValues: {
              create: combo.map((attributeValueId) => ({
                attributeId: valueAttr.get(attributeValueId)!,
                attributeValueId,
              })),
            },
          },
        });
      }
    });

    revalidate(productId);
    return { created: toCreate.length };
  });
}

export async function updateVariant(
  variantId: string,
  input: z.input<typeof variantUpdateSchema>,
) {
  return staffAction(async (session) => {
    const data = variantUpdateSchema.parse(input);
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, productId: true, stock: true },
    });
    if (!variant) throw new ActionError("La variante no existe.");
    if (data.compareAtPrice !== null && data.compareAtPrice <= data.price) {
      throw new ActionError(
        "El precio anterior debe ser mayor que el precio actual.",
      );
    }

    await db.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          sku: data.sku || null,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          weightGrams: data.weightGrams ?? null,
          isActive: data.isActive,
        },
      });
      if (data.stock !== variant.stock) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: data.stock },
        });
        await recordMovement(tx, {
          variantId,
          type: data.stock > variant.stock ? "RESTOCK" : "ADJUSTMENT",
          quantityDelta: data.stock - variant.stock,
          stockBefore: variant.stock,
          stockAfter: data.stock,
          reason: "Ajuste manual desde el panel",
          adminUserId: session.user.id,
        });
      }
    });

    revalidate(variant.productId);
    return null;
  });
}

export async function deleteVariant(variantId: string) {
  return staffAction(async () => {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        _count: { select: { orderItems: true } },
        product: {
          select: { id: true, _count: { select: { variants: true } } },
        },
      },
    });
    if (!variant) throw new ActionError("La variante no existe.");
    if (variant._count.orderItems > 0) {
      throw new ActionError(
        "Esta combinación tiene ventas: desactívala en vez de eliminarla.",
      );
    }
    if (variant.product._count.variants <= 1) {
      throw new ActionError("Un producto debe tener al menos una variante.");
    }
    await db.productVariant.delete({ where: { id: variantId } });
    revalidate(variant.product.id);
    return null;
  });
}
