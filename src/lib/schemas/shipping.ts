import { z } from "zod";

import { REGION_NAMES, comunasOf } from "@/data/cl-regions";

export const zoneInputSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  isActive: z.boolean().default(true),
});

export const zoneLocationsSchema = z.object({
  zoneId: z.string().cuid(),
  locations: z
    .array(
      z.object({
        region: z
          .string()
          .refine((r) => REGION_NAMES.includes(r), "Región inválida"),
        comuna: z.string().nullable(),
      }),
    )
    .max(400)
    .superRefine((locs, ctx) => {
      locs.forEach((l, i) => {
        if (l.comuna && !comunasOf(l.region).includes(l.comuna)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "comuna"],
            message: "La comuna no pertenece a la región",
          });
        }
      });
    }),
});

export const rateInputSchema = z.object({
  id: z.string().cuid().optional(),
  zoneId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  price: z.coerce.number().int().min(0).max(9_999_999),
  freeOverSubtotal: z.coerce.number().int().min(0).max(99_999_999).nullable(),
  minWeightGrams: z.coerce.number().int().min(0).max(500_000).nullable(),
  maxWeightGrams: z.coerce.number().int().min(0).max(500_000).nullable(),
  isActive: z.boolean().default(true),
});

export type ZoneInput = z.infer<typeof zoneInputSchema>;
export type RateInput = z.infer<typeof rateInputSchema>;
