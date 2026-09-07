import type { Metadata } from "next";

import { PageShell, PhaseNotice } from "@/components/store/page-shell";

export const metadata: Metadata = { title: "Seguimiento de pedido" };

export default function OrderTrackingPage() {
  return (
    <PageShell
      title="Seguir mi pedido"
      lead="Consulta el estado de tu pedido con el número (TG-XXXXXX) y el email de compra."
    >
      <PhaseNotice area="El seguimiento de pedidos" />
    </PageShell>
  );
}
