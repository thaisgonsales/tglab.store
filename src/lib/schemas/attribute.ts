import { z } from "zod";

export const attributeValueInputSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().trim().min(1, "Requerido").max(60),
  hex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color HEX inválido (#RRGGBB)")
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
});

export const attributeInputSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(60),
  type: z.enum(["SELECT", "COLOR"]),
  values: z
    .array(attributeValueInputSchema)
    .min(1, "Agrega al menos un valor")
    .max(100)
    .superRefine((values, ctx) => {
      const labels = new Set<string>();
      values.forEach((v, i) => {
        const key = v.label.toLowerCase();
        if (labels.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: "Valor duplicado",
            path: [i, "label"],
          });
        }
        labels.add(key);
      });
    }),
});

export type AttributeInput = z.infer<typeof attributeInputSchema>;
export type AttributeValueInput = z.infer<typeof attributeValueInputSchema>;
