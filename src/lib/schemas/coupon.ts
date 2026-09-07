import { z } from "zod";

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Muy corto")
      .max(40)
      .regex(/^[A-Za-z0-9._-]+$/, "Solo letras, números, . _ -")
      .transform((v) => v.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: z.coerce.number().int().min(0).max(99_999_999).default(0),
    startsAt: z.string().optional().or(z.literal("")),
    endsAt: z.string().optional().or(z.literal("")),
    minSubtotal: z.coerce.number().int().min(0).max(99_999_999).nullable(),
    maxUses: z.coerce.number().int().min(1).max(1_000_000).nullable(),
    maxUsesPerCustomer: z.coerce.number().int().min(1).max(1000).nullable(),
    appliesToProductIds: z.array(z.string().cuid()).max(200).default([]),
    appliesToCategoryIds: z.array(z.string().cuid()).max(100).default([]),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENT" && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "El porcentaje debe estar entre 1 y 100",
      });
    }
    if (data.type === "FIXED" && data.value < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Ingresa el monto del descuento",
      });
    }
    if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "La fecha de término es anterior al inicio",
      });
    }
  });

export type CouponInput = z.infer<typeof couponInputSchema>;
