import Link from "next/link";
import { requireCustomer } from "@/server/auth/customer-session";
import { getSettingsGroup } from "@/server/services/settings-service";
import { CustomerSignOut } from "@/components/account/account-controls";

export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();
  const copy = await getSettingsGroup("account");
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{copy.account}</h1>
          <p className="text-foreground-muted mt-1">{session.user.name}</p>
        </div>
        <CustomerSignOut copy={copy} />
      </div>
      <nav
        aria-label={copy.account}
        className="mb-8 flex flex-wrap gap-2 border-b pb-4"
      >
        {(
          [
            ["/cuenta", copy.profile],
            ["/cuenta/pedidos", copy.orders],
            ["/cuenta/favoritos", "Favoritos"],
            ["/cuenta/direcciones", copy.addresses],
            ["/cuenta/seguridad", copy.security],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="hover:bg-surface-muted rounded-md px-4 py-2 text-sm font-medium"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
