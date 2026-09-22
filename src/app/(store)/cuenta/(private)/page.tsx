import { requireCustomer } from "@/server/auth/customer-session";
import { getCustomerProfile } from "@/server/services/customer-account-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { isAuthEmailConfigured } from "@/server/providers/auth-email";
import {
  EmailVerification,
  ProfileForm,
} from "@/components/account/account-controls";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await requireCustomer();
  const [profile, copy] = await Promise.all([
    getCustomerProfile(session.user.id),
    getSettingsGroup("account"),
  ]);
  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{copy.verificationError}</p>}
      <h2 className="text-xl font-semibold">{copy.profile}</h2>
      <ProfileForm copy={copy} profile={profile} />
      <EmailVerification
        copy={copy}
        email={profile.email}
        verified={profile.emailVerified}
        emailEnabled={isAuthEmailConfigured()}
      />
    </div>
  );
}
