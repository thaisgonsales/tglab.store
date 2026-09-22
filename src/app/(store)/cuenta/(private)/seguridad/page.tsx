import { requireCustomer } from "@/server/auth/customer-session";
import { getSettingsGroup } from "@/server/services/settings-service";
import { SecurityPanel } from "@/components/account/security-panel";

export default async function Page() {
  const session = await requireCustomer();
  return (
    <SecurityPanel
      copy={await getSettingsGroup("account")}
      currentId={session.session.id}
    />
  );
}
