type CheckResult = { errors: string[]; warnings: string[] };

function isLocalUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function checkProductionEnvironment(): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env;
  const required = [
    "NEXT_PUBLIC_SITE_URL",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
  ] as const;

  for (const key of required) {
    if (!env[key]?.trim()) errors.push(`${key} no está configurada.`);
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "";
  const authUrl = env.BETTER_AUTH_URL ?? "";
  if (!siteUrl.startsWith("https://") || isLocalUrl(siteUrl)) {
    errors.push("NEXT_PUBLIC_SITE_URL debe ser una URL HTTPS pública.");
  }
  if (authUrl !== siteUrl) {
    errors.push("BETTER_AUTH_URL debe coincidir con NEXT_PUBLIC_SITE_URL.");
  }

  const databaseUrl = env.DATABASE_URL ?? "";
  if (isLocalUrl(databaseUrl)) {
    errors.push("DATABASE_URL no puede apuntar a localhost en producción.");
  }
  if (
    databaseUrl.startsWith("postgres") &&
    !databaseUrl.includes("sslmode=require")
  ) {
    warnings.push(
      "DATABASE_URL no declara sslmode=require; confirma que el proveedor fuerce TLS.",
    );
  }

  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < 32 || /reemplazar|secret|change/i.test(secret)) {
    errors.push(
      "BETTER_AUTH_SECRET debe ser aleatorio y tener al menos 32 caracteres.",
    );
  }

  if (env.STORAGE_DRIVER !== "s3") {
    errors.push(
      "STORAGE_DRIVER debe ser s3; el disco local no es persistente.",
    );
  }
  for (const key of [
    "S3_ENDPOINT",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET",
    "S3_PUBLIC_URL",
  ] as const) {
    if (!env[key]?.trim())
      errors.push(`${key} es obligatoria con STORAGE_DRIVER=s3.`);
  }
  if (env.S3_PUBLIC_URL && !env.S3_PUBLIC_URL.startsWith("https://")) {
    errors.push("S3_PUBLIC_URL debe usar HTTPS.");
  }

  if (!env.RESEND_API_KEY) {
    warnings.push(
      "RESEND_API_KEY no está configurada: no se enviarán correos.",
    );
  }
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push(
      "Upstash no está configurado: el rate limit será por instancia.",
    );
  }
  if (!env.SENTRY_DSN) {
    warnings.push("Sentry no está configurado: faltará monitoreo de errores.");
  }

  const hasPayment =
    env.PAYMENTS_BANK_TRANSFER_ENABLED === "true" ||
    Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_WEBHOOK_SECRET) ||
    Boolean(env.TRANSBANK_COMMERCE_CODE && env.TRANSBANK_API_KEY);
  if (!hasPayment)
    errors.push("Debe existir al menos un medio de pago configurado.");

  return { errors, warnings };
}

const result = checkProductionEnvironment();
for (const warning of result.warnings) console.warn(`ADVERTENCIA: ${warning}`);
for (const error of result.errors) console.error(`ERROR: ${error}`);

if (result.errors.length > 0) {
  console.error(`Configuración no apta: ${result.errors.length} error(es).`);
  process.exit(1);
}

console.log("Configuración de producción apta para desplegar.");
