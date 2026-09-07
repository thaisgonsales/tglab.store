import { PageHeader } from "@/components/admin/page-header";
import { SettingsForms } from "@/components/admin/settings-forms";
import { getAllSettings } from "@/server/services/settings-service";
import { paymentMethodsStatus } from "@/server/payments/registry";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAllSettings();
  const payments = paymentMethodsStatus();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Configuración"
        description="Marca, contacto, retiro, despacho y datos para transferencia."
      />
      <SettingsForms settings={settings} paymentMethods={payments} />
    </div>
  );
}
