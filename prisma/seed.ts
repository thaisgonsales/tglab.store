/**
 * Semilla de DESARROLLO para TG LAB.
 *
 *   npm run db:seed
 *
 * Crea configuración por defecto, categorías, atributos y 4 productos DEMO.
 * Es idempotente (usa upserts por slug/clave). Las imágenes son placeholders
 * hasta que se carguen las fotografías reales desde /admin.
 *
 * IMPORTANTE: no crea usuarios de administración (eso es `npm run admin:create`).
 */
import { allDefaults } from "../src/config/settings-schema";
import { slugify } from "../src/lib/slug";
import { db } from "../src/server/db";
import type { Prisma } from "../src/generated/prisma/client";

const PLACEHOLDER = "/placeholder-product.svg";

async function seedSettings() {
  const defaults = allDefaults();
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: {}, // no piso configuración ya editada
    });
  }

  // Datos DEMO para poder probar el checkout completo en desarrollo.
  await db.setting.upsert({
    where: { key: "commerce" },
    create: {
      key: "commerce",
      value: {
        ...defaults.commerce,
        pickupEnabled: true,
        bankTransferInstructions:
          "[DEMO] Datos de ejemplo — reemplázalos en /admin/configuracion.",
        bankTransferDetails: {
          accountHolder: "[DEMO] Nombre Apellido",
          rut: "11.111.111-1",
          bank: "[DEMO] Banco Ejemplo",
          accountType: "Cuenta Vista",
          accountNumber: "00000000",
          email: "pagos@tglab.local",
        },
      } as Prisma.InputJsonValue,
    },
    update: {},
  });
  console.log("· settings");
}

async function seedCategories() {
  const tree: { name: string; children: string[] }[] = [
    { name: "Gamer", children: ["Soportes", "Decoración gamer"] },
    { name: "Hogar", children: ["Organizadores", "Decoración", "Maceteros"] },
    { name: "Personalizados", children: [] },
  ];

  let position = 0;
  for (const parent of tree) {
    const parentSlug = slugify(parent.name);
    const parentRow = await db.category.upsert({
      where: { slug: parentSlug },
      create: { name: parent.name, slug: parentSlug, position: position++ },
      update: {},
    });
    let childPos = 0;
    for (const child of parent.children) {
      const childSlug = slugify(`${parent.name}-${child}`);
      await db.category.upsert({
        where: { slug: childSlug },
        create: {
          name: child,
          slug: childSlug,
          parentId: parentRow.id,
          position: childPos++,
        },
        update: {},
      });
    }
  }
  console.log("· categorías");
}

async function seedAttributes() {
  const color = await db.attribute.upsert({
    where: { slug: "color" },
    create: { name: "Color", slug: "color", type: "COLOR", position: 0 },
    update: {},
  });

  const colors: { label: string; hex: string }[] = [
    { label: "Negro", hex: "#000000" },
    { label: "Blanco", hex: "#FFFFFF" },
    { label: "Rojo", hex: "#E11D2E" },
  ];
  let pos = 0;
  for (const c of colors) {
    await db.attributeValue.upsert({
      where: {
        attributeId_slug: { attributeId: color.id, slug: slugify(c.label) },
      },
      create: {
        attributeId: color.id,
        label: c.label,
        slug: slugify(c.label),
        hex: c.hex,
        position: pos++,
      },
      update: { hex: c.hex },
    });
  }

  const modelo = await db.attribute.upsert({
    where: { slug: "modelo" },
    create: { name: "Modelo", slug: "modelo", type: "SELECT", position: 1 },
    update: {},
  });
  const modelos = ["PS5", "Xbox", "Nintendo Switch"];
  pos = 0;
  for (const label of modelos) {
    await db.attributeValue.upsert({
      where: {
        attributeId_slug: { attributeId: modelo.id, slug: slugify(label) },
      },
      create: {
        attributeId: modelo.id,
        label,
        slug: slugify(label),
        position: pos++,
      },
      update: {},
    });
  }
  console.log("· atributos");
  return { color, modelo };
}

async function categoryIdBySlug(slug: string): Promise<string> {
  const row = await db.category.findUnique({ where: { slug } });
  if (!row) throw new Error(`Categoría no encontrada: ${slug}`);
  return row.id;
}

async function upsertSimpleProduct(input: {
  name: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  categorySlug: string;
  featured?: boolean;
}) {
  const slug = slugify(input.name);
  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) return existing;

  const categoryId = await categoryIdBySlug(input.categorySlug);

  return db.product.create({
    data: {
      name: input.name,
      slug,
      type: "SIMPLE",
      status: "PUBLISHED",
      isFeatured: input.featured ?? false,
      shortDescription: input.shortDescription,
      publishedAt: new Date(),
      allowsShipping: true,
      allowsPickup: true,
      categories: { create: { categoryId, isPrimary: true } },
      media: {
        create: {
          type: "IMAGE",
          provider: "local",
          url: PLACEHOLDER,
          alt: input.name,
          isPrimary: true,
          position: 0,
        },
      },
      variants: {
        create: {
          optionsKey: "",
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          stock: input.stock,
          position: 0,
        },
      },
    },
  });
}

async function upsertVariableProduct(input: {
  name: string;
  shortDescription: string;
  basePrice: number;
  categorySlug: string;
  colorId: string;
  featured?: boolean;
  stockByColor: Record<string, number>;
}) {
  const slug = slugify(input.name);
  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) return existing;

  const categoryId = await categoryIdBySlug(input.categorySlug);
  const colorValues = await db.attributeValue.findMany({
    where: { attributeId: input.colorId },
    orderBy: { position: "asc" },
  });

  const product = await db.product.create({
    data: {
      name: input.name,
      slug,
      type: "VARIABLE",
      status: "PUBLISHED",
      isFeatured: input.featured ?? false,
      shortDescription: input.shortDescription,
      publishedAt: new Date(),
      allowsShipping: true,
      allowsPickup: true,
      categories: { create: { categoryId, isPrimary: true } },
      attributes: { create: { attributeId: input.colorId, position: 0 } },
      media: {
        create: {
          type: "IMAGE",
          provider: "local",
          url: PLACEHOLDER,
          alt: input.name,
          isPrimary: true,
          position: 0,
        },
      },
    },
  });

  let position = 0;
  for (const value of colorValues) {
    const stock = input.stockByColor[value.label] ?? 0;
    await db.productVariant.create({
      data: {
        productId: product.id,
        optionsKey: value.id,
        sku: `${slug}-${value.slug}`.toUpperCase(),
        price: input.basePrice,
        stock,
        position: position++,
        attributeValues: {
          create: {
            attributeId: input.colorId,
            attributeValueId: value.id,
          },
        },
      },
    });
  }

  return product;
}

async function seedShipping() {
  const existing = await db.shippingZone.findFirst();
  if (existing) return;

  await db.shippingZone.create({
    data: {
      name: "Chile continental",
      position: 0,
      locations: {
        create: [
          { region: "Región Metropolitana de Santiago" },
          { region: "Región de Los Lagos" },
          { region: "Región de Valparaíso" },
        ],
      },
      rates: {
        create: [
          {
            name: "Despacho estándar",
            price: 4990,
            freeOverSubtotal: 39990,
            position: 0,
          },
        ],
      },
    },
  });

  await db.shippingZone.create({
    data: {
      name: "Retiro en Chiloé",
      position: 1,
      locations: {
        create: [{ region: "Región de Los Lagos", comuna: "Castro" }],
      },
      rates: { create: [{ name: "Retiro coordinado", price: 0, position: 0 }] },
    },
  });
  console.log("· despachos");
}

async function seedCoupon() {
  await db.coupon.upsert({
    where: { code: "BIENVENIDO10" },
    create: {
      code: "BIENVENIDO10",
      type: "PERCENT",
      value: 10,
      minSubtotal: 15000,
      maxUsesPerCustomer: 1,
      isActive: true,
    },
    update: {},
  });
  console.log("· cupón demo");
}

async function main() {
  console.log("Seed TG LAB (desarrollo)…");
  await seedSettings();
  await seedCategories();
  const { color } = await seedAttributes();

  await upsertSimpleProduct({
    name: "Kit Decorativo Pac-Man",
    shortDescription:
      "Set de figuras decorativas inspiradas en el clásico arcade.",
    price: 5990,
    stock: 5,
    categorySlug: slugify("Gamer-Decoración gamer"),
    featured: true,
  });

  await upsertSimpleProduct({
    name: "Decoración Gamer PlayStation",
    shortDescription: "Pieza mural con los íconos de PlayStation.",
    price: 7990,
    compareAtPrice: 9990,
    stock: 8,
    categorySlug: slugify("Gamer-Decoración gamer"),
  });

  await upsertVariableProduct({
    name: "Soporte para Audífonos Gamer",
    shortDescription: "Organiza tu headset y libera espacio en el escritorio.",
    basePrice: 8990,
    categorySlug: slugify("Gamer-Soportes"),
    colorId: color.id,
    featured: true,
    stockByColor: { Negro: 4, Blanco: 6, Rojo: 2 },
  });

  await upsertVariableProduct({
    name: "Soporte para Control Gamer",
    shortDescription: "Base para dejar tu control a la vista y siempre a mano.",
    basePrice: 6990,
    categorySlug: slugify("Gamer-Soportes"),
    colorId: color.id,
    stockByColor: { Negro: 7, Blanco: 3, Rojo: 0 },
  });

  console.log("· 4 productos demo");

  await seedShipping();
  await seedCoupon();

  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
