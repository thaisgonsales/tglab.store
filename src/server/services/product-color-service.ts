import "server-only";

import { slugify } from "@/lib/slug";
import { buildOptionsKey } from "@/lib/variant-key";
import { db } from "@/server/db";

export class ProductColorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductColorError";
  }
}

export async function addColorToProduct(input: {
  productId: string;
  label: string;
  hex: string;
}) {
  const product = await db.product.findUnique({
    where: { id: input.productId },
    include: {
      attributes: { include: { attribute: true } },
      variants: {
        include: {
          attributeValues: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!product) throw new ProductColorError("El producto no existe.");

  const assignedColors = product.attributes.filter(
    (entry) => entry.attribute.type === "COLOR",
  );
  if (assignedColors.length > 1) {
    throw new ProductColorError(
      "Este producto tiene configuraciones de color antiguas duplicadas. Quita el duplicado antes de agregar otro color.",
    );
  }
  if (product.attributes.some((entry) => entry.attribute.type !== "COLOR")) {
    throw new ProductColorError(
      "Este producto combina colores con otras opciones. Usa la configuración avanzada para mantener todas las combinaciones.",
    );
  }

  let colorAttribute = assignedColors[0]?.attribute;
  if (!colorAttribute) {
    colorAttribute =
      (await db.attribute.findUnique({ where: { slug: "color" } })) ??
      (await db.attribute.findFirst({
        where: { type: "COLOR" },
        orderBy: { createdAt: "asc" },
      })) ??
      (await db.attribute.create({
        data: { name: "Color", slug: "color", type: "COLOR", position: 0 },
      }));
  }

  const attributeId = colorAttribute.id;
  const normalizedSlug = slugify(input.label) || "color";
  let value = await db.attributeValue.findFirst({
    where: {
      attributeId,
      label: { equals: input.label, mode: "insensitive" },
    },
  });
  if (!value) {
    const slugCollision = await db.attributeValue.findUnique({
      where: { attributeId_slug: { attributeId, slug: normalizedSlug } },
    });
    const position = await db.attributeValue.count({ where: { attributeId } });
    value = await db.attributeValue.create({
      data: {
        attributeId,
        label: input.label,
        slug: slugCollision
          ? `${normalizedSlug}-${position + 1}`
          : normalizedSlug,
        hex: input.hex,
        position,
      },
    });
  }

  const existingVariant = product.variants.find((variant) =>
    variant.attributeValues.some((link) => link.attributeValueId === value!.id),
  );
  if (existingVariant) {
    await db.attributeValue.update({
      where: { id: value.id },
      data: { label: input.label, hex: input.hex },
    });
    return {
      attributeId,
      colorId: value.id,
      variantId: existingVariant.id,
      created: false,
    };
  }

  const base = product.variants[0];
  if (!base) {
    throw new ProductColorError("El producto no tiene una opción base.");
  }
  const key = buildOptionsKey([value.id]);
  const skuBase = (product.sku || slugify(product.name) || "SKU").toUpperCase();
  const sku = `${skuBase}-${value.slug}`.toUpperCase().slice(0, 60);

  const variantId = await db.$transaction(async (tx) => {
    await tx.productAttribute.upsert({
      where: {
        productId_attributeId: { productId: product.id, attributeId },
      },
      create: { productId: product.id, attributeId, position: 0 },
      update: { position: 0 },
    });
    await tx.product.update({
      where: { id: product.id },
      data: { type: "VARIABLE" },
    });

    const canReuseBase =
      base.optionsKey === "" &&
      base.attributeValues.length === 0 &&
      base._count.orderItems === 0;
    if (canReuseBase) {
      await tx.productVariant.update({
        where: { id: base.id },
        data: {
          optionsKey: key,
          sku,
          attributeValues: {
            create: { attributeId, attributeValueId: value!.id },
          },
        },
      });
      return base.id;
    }

    const created = await tx.productVariant.create({
      data: {
        productId: product.id,
        optionsKey: key,
        sku,
        price: base.price,
        compareAtPrice: base.compareAtPrice,
        stock: 0,
        weightGrams: base.weightGrams,
        position: product.variants.length,
        attributeValues: {
          create: { attributeId, attributeValueId: value!.id },
        },
      },
      select: { id: true },
    });
    return created.id;
  });

  return { attributeId, colorId: value.id, variantId, created: true };
}
