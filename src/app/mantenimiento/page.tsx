import type { Metadata } from "next";

import { BrandLogo } from "@/components/store/brand-logo";
import { getSettingsGroup } from "@/server/services/settings-service";

export const metadata: Metadata = {
  title: "Volvemos pronto",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const brand = await getSettingsGroup("brand");

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
      <section className="mx-auto max-w-lg text-center">
        <BrandLogo
          name={brand.storeName}
          className="mx-auto h-24 w-auto sm:h-28"
        />
        <p className="text-brand mt-10 text-xs font-semibold tracking-[0.22em] uppercase">
          Estamos preparando algo especial
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Volvemos muy pronto
        </h1>
        <p className="text-foreground-muted mx-auto mt-4 max-w-md leading-relaxed">
          Estamos terminando los últimos detalles de la tienda para ofrecerte
          una mejor experiencia. Gracias por tu paciencia.
        </p>
        <div
          className="bg-brand mx-auto mt-8 h-1 w-14 rounded-full"
          aria-hidden="true"
        />
      </section>
    </main>
  );
}
