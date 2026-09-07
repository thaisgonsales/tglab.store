import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

import { Analytics } from "@/components/analytics";
import { Providers } from "@/components/providers";
import { publicEnv } from "@/lib/env";
import { brandCssVars } from "@/lib/brand-style";
import { getSettingsGroup } from "@/server/services/settings-service";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSettingsGroup("brand");
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: {
      default: `${brand.storeName} — ${brand.tagline}`,
      template: `%s · ${brand.storeName}`,
    },
    description: brand.tagline,
    applicationName: brand.storeName,
    icons: brand.faviconUrl ? { icon: brand.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      locale: "es_CL",
      siteName: brand.storeName,
      images: [
        { url: brand.ogImageUrl || "/api/og", width: 1200, height: 630 },
      ],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efdf" },
    { media: "(prefers-color-scheme: dark)", color: "#211a19" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const brand = await getSettingsGroup("brand");

  return (
    <html
      lang="es-CL"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      style={brandCssVars(brand)}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
