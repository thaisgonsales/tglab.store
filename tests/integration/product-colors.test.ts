import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";
import { db } from "@/server/db";
import { addColorToProduct } from "@/server/services/product-color-service";

let productId: string;
const createdValueIds: string[] = [];
const suffix = `${Date.now()}`;

beforeAll(async () => {
  const name = `ZZ Test Colores ${suffix}`;
  const product = await db.product.create({
    data: {
      name,
      slug: slugify(name),
      type: "SIMPLE",
      status: "DRAFT",
      variants: {
        create: { optionsKey: "", price: 12_990, stock: 7 },
      },
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await db.product.delete({ where: { id: productId } });
  await db.attributeValue.deleteMany({
    where: { id: { in: createdValueIds } },
  });
});

describe("colores directos del producto", () => {
  it("convierte la variante simple en el primer color sin perder precio ni stock", async () => {
    const result = await addColorToProduct({
      productId,
      label: `Rosado test ${suffix}`,
      hex: "#ef8faf",
    });
    createdValueIds.push(result.colorId);

    const product = await db.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        attributes: true,
        variants: { include: { attributeValues: true } },
      },
    });

    expect(product.type).toBe("VARIABLE");
    expect(product.attributes).toHaveLength(1);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]).toMatchObject({ price: 12_990, stock: 7 });
    expect(product.variants[0]!.attributeValues[0]?.attributeValueId).toBe(
      result.colorId,
    );
  });

  it("crea el segundo color como otra variante independiente", async () => {
    const result = await addColorToProduct({
      productId,
      label: `Verde test ${suffix}`,
      hex: "#63b66d",
    });
    createdValueIds.push(result.colorId);

    const variants = await db.productVariant.findMany({
      where: { productId },
      include: { attributeValues: true },
      orderBy: { position: "asc" },
    });

    expect(variants).toHaveLength(2);
    expect(variants[1]).toMatchObject({ price: 12_990, stock: 0 });
    expect(variants[1]!.attributeValues[0]?.attributeValueId).toBe(
      result.colorId,
    );
  });
});
