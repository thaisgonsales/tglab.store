import { SecurityPanel } from "@/components/account/security-panel";
import { requireStaffForTwoFactorSetup } from "@/server/auth/session";
import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function TwoFactorSetupPage() {
  const session = await requireStaffForTwoFactorSetup();
  const copy = await getSettingsGroup("account");
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Protege tu cuenta</h1>
        <p className="text-foreground-muted mt-2 text-sm">
          La verificación en dos pasos es obligatoria para acceder a la
          administración de TG LAB.
        </p>
      </header>
      <SecurityPanel
        copy={copy}
        staff
        currentId={session.session.id}
        twoFactorEnabled={false}
        twoFactorRequired
      />
    </main>
  );
}
