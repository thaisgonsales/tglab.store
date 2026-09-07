import type { NextConfig } from "next";

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

export default nextConfig;
