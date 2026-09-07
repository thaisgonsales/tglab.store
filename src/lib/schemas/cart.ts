import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(99),
  customizations: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        value: z.string().max(2000),
      }),
    )
    .max(20)
    .default([]),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartLineSchema = z.object({
  lineId: z.string().cuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});
