import "server-only";

import { z } from "zod";

/**
 * Validación de variables de entorno del servidor.
 * Se evalúa de forma perezosa (lazy) para no romper el build cuando faltan
 * credenciales opcionales; los servicios que las necesitan comprueban
 * `isConfigured()` antes de operar.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET debe tener al menos 16 caracteres"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // Almacenamiento
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("auto"),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_BUCKET: z.string().optional().default(""),
  S3_PUBLIC_URL: z.string().optional().default(""),
  UPLOAD_MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(8_388_608),
  UPLOAD_MAX_VIDEO_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(104_857_600),

  // Pagos
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional().default(""),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional().default(""),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional().default(""),
  MERCADOPAGO_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
  PAYMENTS_BANK_TRANSFER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  TRANSBANK_COMMERCE_CODE: z.string().optional().default(""),
  TRANSBANK_API_KEY: z.string().optional().default(""),
  TRANSBANK_MODE: z.enum(["integration", "production"]).default("integration"),

  // Email
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("TG LAB <onboarding@resend.dev>"),
  EMAIL_REPLY_TO: z.string().optional().default(""),

  // Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  // Monitoreo
  SENTRY_DSN: z.string().optional().default(""),

  // SII
  SII_DOCUMENTS_DRIVER: z.string().optional().default("none"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes:\n${issues}\n` +
        `Revisa tu archivo .env (usa .env.example como referencia).`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Variables públicas seguras para el navegador (prefijo NEXT_PUBLIC_). */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
} as const;
