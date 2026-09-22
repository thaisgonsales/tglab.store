import { requireRole } from "@/server/auth/session";
import { listStaffAccounts } from "@/server/services/access-management-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import {
  AccessToggle,
  CreateStaffForm,
} from "@/components/admin/access-management";

export default async function Page() {
  const session = await requireRole("owner");
  const [users, copy] = await Promise.all([
    listStaffAccounts(),
    getSettingsGroup("account"),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{copy.team}</h1>
      <div className="space-y-3">
        {users.map((user) => (
          <article
            key={user.id}
            className="bg-surface rounded-card flex flex-wrap items-center justify-between gap-3 border p-4"
          >
            <div>
              <h2 className="font-medium">{user.name}</h2>
              <p className="text-foreground-muted text-sm break-all">
                {user.email} · {user.role === "owner" ? copy.owner : copy.staff}{" "}
                · {user.isActive ? copy.active : copy.inactive}
              </p>
              {user.twoFactorEnabled && (
                <p className="text-brand text-xs">{copy.twoFactorEnabled}</p>
              )}
            </div>
            {user.id !== session.user.id && (
              <AccessToggle
                copy={copy}
                id={user.id}
                isActive={user.isActive}
                kind="staff"
              />
            )}
          </article>
        ))}
      </div>
      <CreateStaffForm copy={copy} />
    </div>
  );
}
