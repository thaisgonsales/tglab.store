import { NextResponse } from "next/server";

import { getSettingsGroup } from "@/server/services/settings-service";

export async function GET() {
  const brand = await getSettingsGroup("brand");

  return NextResponse.json(
    {
      id: "/admin",
      name: `${brand.storeName} — Administración`,
      short_name: `${brand.storeName} Admin`,
      description: `Administración de ${brand.storeName}`,
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      orientation: "any",
      background_color: brand.colorBackground,
      theme_color: brand.colorPrimary,
      lang: "es-CL",
      categories: ["business"],
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
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  );
}
