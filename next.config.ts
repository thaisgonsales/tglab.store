import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const storageOrigin = (() => {
  try {
    return process.env.S3_PUBLIC_URL
      ? new URL(process.env.S3_PUBLIC_URL).origin
      : "";
  } catch {
    return "";
  }
})();

const sentryOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SENTRY_DSN
      ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).origin
      : "";
  } catch {
    return "";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${storageOrigin} https://www.google-analytics.com https://www.facebook.com`.trim(),
  `media-src 'self' blob: ${storageOrigin}`.trim(),
  `connect-src 'self' ${sentryOrigin} https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com`.trim(),
  "form-action 'self' https://webpay3g.transbank.cl https://webpay3gint.transbank.cl",
  "upgrade-insecure-requests",
].join("; ");

/** Cabeceras de seguridad aplicadas a todas las rutas. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

// Dominio público del almacenamiento de objetos (R2 / CDN).
if (process.env.S3_PUBLIC_URL) {
  try {
    const url = new URL(process.env.S3_PUBLIC_URL);
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
    });
  } catch {
    // URL inválida: se ignora, las imágenes remotas no cargarán hasta corregirla.
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
    // El placeholder de producto es un SVG propio; el contenido de terceros
    // se re-encoda a WebP en el pipeline de subida (nunca se guardan SVG).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
});
