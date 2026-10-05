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
  const usesRailwayPrivateNetwork = (() => {
    try {
      return new URL(databaseUrl).hostname.endsWith(".railway.internal");
    } catch {
      return false;
    }
  })();
  if (
    databaseUrl.startsWith("postgres") &&
    !databaseUrl.includes("sslmode=require") &&
    !usesRailwayPrivateNetwork
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
    "S3_PRIVATE_BUCKET",
    "S3_PUBLIC_URL",
  ] as const) {
    if (!env[key]?.trim())
      errors.push(`${key} es obligatoria con STORAGE_DRIVER=s3.`);
  }
  if (env.S3_PUBLIC_URL && !env.S3_PUBLIC_URL.startsWith("https://")) {
    errors.push("S3_PUBLIC_URL debe usar HTTPS.");
  }
  if (
    env.S3_BUCKET &&
    env.S3_PRIVATE_BUCKET &&
    env.S3_BUCKET === env.S3_PRIVATE_BUCKET
  ) {
    errors.push("S3_PRIVATE_BUCKET debe ser distinto del bucket público.");
  }

  if (!env.RESEND_API_KEY) {
    warnings.push(
      "RESEND_API_KEY no está configurada: no se enviarán correos.",
    );
  }
  if (!env.SENTRY_DSN) {
    warnings.push("Sentry no está configurado: faltará monitoreo de errores.");
  }

  const hasChilexpressKeys = Boolean(
    env.CHILEXPRESS_COVERAGE_API_KEY && env.CHILEXPRESS_RATING_API_KEY,
  );
  if (hasChilexpressKeys && env.CHILEXPRESS_API_ENV !== "production") {
    errors.push(
      "Chilexpress tiene credenciales, pero continúa usando servicios de prueba.",
    );
  }

  const hasBankTransfer = env.PAYMENTS_BANK_TRANSFER_ENABLED === "true";
  const hasMercadoPagoCredentials = Boolean(
    env.MERCADOPAGO_ACCESS_TOKEN &&
    env.MERCADOPAGO_PUBLIC_KEY &&
    env.MERCADOPAGO_WEBHOOK_SECRET,
  );
  const hasWebpayCredentials = Boolean(
    env.TRANSBANK_COMMERCE_CODE && env.TRANSBANK_API_KEY,
  );
  const hasMercadoPago =
    hasMercadoPagoCredentials && env.MERCADOPAGO_MODE === "production";
  const hasWebpay =
    hasWebpayCredentials && env.TRANSBANK_MODE === "production";
  const hasPayment = hasBankTransfer || hasMercadoPago || hasWebpay;

  if (hasMercadoPagoCredentials && env.MERCADOPAGO_MODE !== "production") {
    errors.push("Mercado Pago tiene credenciales, pero continúa en modo sandbox.");
  }
  if (hasWebpayCredentials && env.TRANSBANK_MODE !== "production") {
    errors.push("Webpay tiene credenciales, pero continúa en modo integración.");
  }
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
