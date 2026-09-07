import type { Metadata } from "next";

import { PageShell, PhaseNotice } from "@/components/store/page-shell";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <PageShell title="Finalizar compra">
      <PhaseNotice area="El checkout (datos, despacho y pago)" />
    </PageShell>
  );
}
