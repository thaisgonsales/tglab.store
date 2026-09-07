import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";
import { db } from "@/server/db";

// Se genera bajo demanda (con caché) para no depender de la BD en build.
export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "",
  "/productos",
  "/categorias",
  "/personalizados",
  "/nosotros",
  "/contacto",
  "/preguntas-frecuentes",
  "/despachos",
  "/cambios-devoluciones",
  "/terminos",
  "/privacidad",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: {
          status: "PUBLISHED",
          archivedAt: null,
          publishedAt: { not: null },
        },
        select: { slug: true, updatedAt: true },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    dynamicEntries = [
      ...products.map((p) => ({
        url: `${base}/producto/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...categories.map((c) => ({
        url: `${base}/categoria/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    dynamicEntries = [];
  }

  return [...staticEntries, ...dynamicEntries];
}
