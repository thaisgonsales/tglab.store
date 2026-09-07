import type { Metadata } from "next";

import { CustomRequestForm } from "@/components/store/custom-request-form";
import { getSettingsGroup } from "@/server/services/settings-service";

export const metadata: Metadata = {
  title: "Productos personalizados",
  description:
    "Solicita un producto hecho a tu medida mediante impresión 3D. Enviar la solicitud no constituye una compra.",
};

export default async function CustomRequestsPage() {
  const home = await getSettingsGroup("home");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        {home.customCtaTitle}
      </h1>
      <p className="text-foreground-muted mt-2 text-sm">{home.customCtaText}</p>

      <div className="mt-8">
        <CustomRequestForm />
      </div>
    </div>
  );
}
