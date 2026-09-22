import { requireStaff } from "@/server/auth/session";
import { getSettingsGroup } from "@/server/services/settings-service";
import { SecurityPanel } from "@/components/account/security-panel";

export default async function Page() {
  const session = await requireStaff();
  return (
    <SecurityPanel
      copy={await getSettingsGroup("account")}
      staff
      currentId={session.session.id}
      twoFactorEnabled={session.user.twoFactorEnabled ?? false}
    />
  );
}
