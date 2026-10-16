import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function OfflinePage() {
  const brand = await getSettingsGroup("brand");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <section className="rounded-card border-border bg-surface w-full max-w-md border p-8 text-center shadow-sm">
        <WifiOff className="text-brand mx-auto size-12" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold">Sin conexión</h1>
        <p className="text-foreground-muted mt-3 text-sm leading-6">
          No pudimos conectar con {brand.storeName}. Revisa tu conexión a
          Internet e inténtalo nuevamente.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Volver a intentar</Link>
        </Button>
      </section>
    </main>
  );
}
