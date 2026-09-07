import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Solo minúsculas, números y guiones")
    .max(90)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  parentId: z.string().cuid().nullable().optional(),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().cuid()).min(1),
});
