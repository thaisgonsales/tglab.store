import { z } from "zod";

import { clpAmount, clpAmountOptional } from "@/lib/schemas/product";

export const setAttributesSchema = z.object({
  productId: z.string().cuid(),
  attributeIds: z.array(z.string().cuid()).max(4),
});

export const generateVariantsSchema = z.object({
  productId: z.string().cuid(),
  /** attributeId -> valores seleccionados de ese atributo */
  selection: z
    .array(
      z.object({
        attributeId: z.string().cuid(),
        valueIds: z.array(z.string().cuid()).min(1),
      }),
    )
    .min(1),
});

export const variantUpdateSchema = z.object({
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  price: clpAmount,
  compareAtPrice: clpAmountOptional,
  stock: z.coerce.number().int().min(0).max(1_000_000),
  weightGrams: z.coerce.number().int().min(0).max(500_000).optional(),
  isActive: z.boolean().default(true),
});

export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const customFieldSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().trim().min(1, "Requerido").max(80),
  helpText: z.string().trim().max(200).optional().or(z.literal("")),
  type: z.enum([
    "TEXT_SHORT",
    "TEXT_LONG",
    "NUMBER",
    "SELECT",
    "CHECKBOX",
    "FILE",
  ]),
  isRequired: z.boolean().default(false),
  maxLength: z.coerce.number().int().min(1).max(5000).optional(),
  options: z.array(z.string().trim().min(1)).max(50).default([]),
});

export const saveCustomFieldsSchema = z.object({
  productId: z.string().cuid(),
  fields: z.array(customFieldSchema).max(20),
});

export type CustomFieldInput = z.infer<typeof customFieldSchema>;
