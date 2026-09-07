import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** Precio en CLP: entero >= 0. Acepta "12.990" o "12990" desde el formulario. */
export const clpAmount = z
  .union([z.number(), z.string()])
  .transform((v) =>
    typeof v === "number" ? v : Number(v.replace(/[^\d]/g, "")),
  )
  .pipe(z.number().int("Monto inválido").min(0).max(99_999_999));

export const clpAmountOptional = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n =
      typeof v === "number" ? v : Number(String(v).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : null;
  })
  .pipe(z.number().int().min(0).max(99_999_999).nullable());

/** Datos base al crear un producto (simple). */
export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(140),
  categoryId: z.string().cuid("Selecciona una categoría"),
  price: clpAmount,
  compareAtPrice: clpAmountOptional,
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).default("DRAFT"),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** Edición completa de la ficha (producto simple; variantes: Fase 4). */
export const productUpdateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones")
    .max(150),
  sku: optionalText(60),
  shortDescription: optionalText(300),
  description: optionalText(8000),

  categoryIds: z
    .array(z.string().cuid())
    .min(1, "Elige al menos una categoría"),
  primaryCategoryId: z.string().cuid().optional(),

  price: clpAmount,
  compareAtPrice: clpAmountOptional,
  stock: z.coerce.number().int().min(0).max(1_000_000),

  material: optionalText(120),
  dimensions: optionalText(120),
  weightGrams: z.coerce.number().int().min(0).max(500_000).optional(),
  packageWeightGrams: z.coerce.number().int().min(0).max(500_000).optional(),

  allowsShipping: z.boolean().default(true),
  allowsPickup: z.boolean().default(true),

  lowStockThreshold: z.coerce.number().int().min(0).max(10_000).optional(),
  lastUnitsThreshold: z.coerce.number().int().min(0).max(10_000).optional(),

  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
  isFeatured: z.boolean().default(false),

  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
