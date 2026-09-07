import type { Metadata } from "next";

import { PageShell, PhaseNotice } from "@/components/store/page-shell";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <PageShell title="Tu carrito">
      <PhaseNotice area="El carrito" />
    </PageShell>
  );
}
