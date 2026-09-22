import Link from "next/link";
import { requireStaff, isOwner } from "@/server/auth/session";
import { listCustomerAccounts } from "@/server/services/access-management-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { AccessToggle } from "@/components/admin/access-management";

export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const session = await requireStaff();
  const { pagina } = await searchParams;
  const [result, copy] = await Promise.all([listCustomerAccounts(pagina), getSettingsGroup("account")]);
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">{copy.customerAccounts}</h1>{!result.accounts.length && <p>{copy.noAccounts}</p>}<div className="space-y-3">{result.accounts.map((user) => <article key={user.id} className="bg-surface rounded-card flex flex-wrap items-center justify-between gap-3 border p-4"><div><h2 className="font-medium">{user.name}</h2><p className="text-foreground-muted text-sm break-all">{user.email} · {user.emailVerified ? copy.verified : copy.unverified}</p><p className="text-sm">{copy.orders}: {user._count.orders} · {user.isActive ? copy.active : copy.inactive}</p></div>{isOwner(session) && <AccessToggle copy={copy} id={user.id} isActive={user.isActive} kind="customer" />}</article>)}</div><div className="flex justify-between">{result.page > 1 && <Link href={`?pagina=${result.page - 1}`}>{copy.previous}</Link>}{result.page < result.pages && <Link href={`?pagina=${result.page + 1}`}>{copy.next}</Link>}</div></div>;
}
