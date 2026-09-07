import type { Metadata } from "next";

import { PageShell, PhaseNotice } from "@/components/store/page-shell";

export const metadata: Metadata = {
  title: "Productos personalizados",
  description:
    "Solicita un producto hecho a tu medida mediante impresión 3D. Enviar la solicitud no constituye una compra.",
};

export default function CustomRequestsPage() {
  return (
    <PageShell
      title="Productos personalizados"
      lead="Cuéntanos tu idea y te enviaremos una cotización. Enviar esta solicitud no constituye automáticamente una compra."
    >
      <PhaseNotice area="El formulario de solicitudes personalizadas" />
    </PageShell>
  );
}
