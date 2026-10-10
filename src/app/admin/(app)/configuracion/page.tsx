import { PageHeader } from "@/components/admin/page-header";
import { SettingsForms } from "@/components/admin/settings-forms";
import { getAllSettings } from "@/server/services/settings-service";
import { paymentMethodsStatus } from "@/server/payments/registry";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAllSettings();
  const payments = paymentMethodsStatus();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Configuración"
        description="Elige una sección, realiza los cambios y guárdala."
      />
      <SettingsForms settings={settings} paymentMethods={payments} />
    </div>
  );
}
