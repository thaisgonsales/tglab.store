import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm, type AuthMode } from "@/components/account/auth-form";
import { getSettingsGroup } from "@/server/services/settings-service";
import { getCustomerSession } from "@/server/auth/customer-session";
import { getStaffSession } from "@/server/auth/session";
import { isAuthEmailConfigured } from "@/server/providers/auth-email";

export async function AuthPage({
  mode,
  staff = false,
}: {
  mode: AuthMode;
  staff?: boolean;
}) {
  const [copy, brand] = await Promise.all([
    getSettingsGroup("account"),
    getSettingsGroup("brand"),
  ]);
  if (mode === "login" || mode === "register") {
    const session = staff
      ? await getStaffSession()
      : await getCustomerSession();
    if (session) redirect(staff ? "/admin" : "/cuenta");
  }
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <p className="text-brand mb-6 text-center text-lg font-semibold">
        {brand.storeName} · {staff ? copy.admin : copy.account}
      </p>
      <div className="bg-surface rounded-card border p-6 shadow-sm sm:p-8">
        <Suspense fallback={<p>{copy.loading}</p>}>
          <AuthForm
            copy={copy}
            mode={mode}
            staff={staff}
            emailEnabled={isAuthEmailConfigured()}
          />
        </Suspense>
      </div>
    </div>
  );
}
