import type { MetadataRoute } from "next";

import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getSettingsGroup("brand");

  return {
    id: "/",
    name: brand.storeName,
    short_name: brand.storeName,
    description: brand.tagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: brand.colorBackground,
    theme_color: brand.colorPrimary,
    lang: "es-CL",
    categories: ["shopping", "business"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
