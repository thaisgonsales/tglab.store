import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getSettingsGroup } from "@/server/services/settings-service";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSettingsGroup("brand");

  return {
    title: {
      default: "Administración",
      template: `%s · Admin ${brand.storeName}`,
    },
    manifest: "/admin.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: `${brand.storeName} Admin`,
    },
    robots: { index: false, follow: false },
  };
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
