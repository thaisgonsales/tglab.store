import { ImageResponse } from "next/og";

import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

/**
 * Imagen Open Graph generada dinámicamente (1200×630).
 * Se usa como fallback cuando no se configura `brand.ogImageUrl` en /admin.
 * Acepta ?title= y ?subtitle= para páginas concretas.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = await getSettingsGroup("brand");

  const title = searchParams.get("title")?.slice(0, 120) || brand.storeName;
  const subtitle = searchParams.get("subtitle")?.slice(0, 160) || brand.tagline;
  const accent = brand.colorPrimary || "#bd527c";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        background: "#f6efdf",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          fontSize: 34,
          fontWeight: 700,
          color: "#3a2b28",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: accent,
          }}
        />
        {brand.storeName}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: "#3a2b28",
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, color: "#8b756b", lineHeight: 1.3 }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: 10,
          width: "100%",
          borderRadius: 999,
          background: accent,
        }}
      />
    </div>,
    { width: 1200, height: 630 },
  );
}
