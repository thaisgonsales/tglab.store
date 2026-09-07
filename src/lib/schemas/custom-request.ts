import { z } from "zod";

export const customRequestSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  email: z.string().trim().email("Email inválido").max(160),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres)")
    .max(4000),
  quantity: z.coerce.number().int().min(1).max(100000).optional(),
  desiredDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  files: z
    .array(
      z.object({
        url: z.string().min(1).max(1000),
        storageKey: z.string().max(500).nullable(),
        mimeType: z.string().max(100),
        sizeBytes: z.number().int().min(0),
      }),
    )
    .max(6)
    .default([]),
  /** Honeypot anti-bot: debe venir vacío. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type CustomRequestInput = z.infer<typeof customRequestSchema>;

export const CUSTOM_REQUEST_STATUSES = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "DONE",
] as const;
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export const CUSTOM_REQUEST_STATUS_LABEL: Record<CustomRequestStatus, string> =
  {
    NEW: "Nueva",
    REVIEWING: "Revisando",
    QUOTED: "Cotizada",
    ACCEPTED: "Aceptada",
    REJECTED: "Rechazada",
    DONE: "Finalizada",
  };
