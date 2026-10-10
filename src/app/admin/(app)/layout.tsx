import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { BrandLogo } from "@/components/store/brand-logo";
import { getSettingsGroup } from "@/server/services/settings-service";
import { requireStaff } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStaff();
  const account = await getSettingsGroup("account");

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-surface sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 print:hidden">
        <Link
          href="/admin"
          aria-label="Ir al inicio de la administración de TG LAB"
          className="flex min-w-0 items-center gap-3 rounded-lg transition-transform duration-200 hover:-translate-y-0.5"
        >
          <BrandLogo name="TG LAB" className="h-10 sm:h-11" />
          <span className="text-foreground-muted hidden text-sm font-normal sm:inline">
            Administración
          </span>
        </Link>
        <AdminUserMenu
          name={session.user.name}
          email={session.user.email}
          role={session.user.role ?? "staff"}
        />
      </header>

      <AdminMobileNav
        owner={session.user.role === "owner"}
        labels={account}
        menuLabel={account.admin}
      />
      <div className="mx-auto flex max-w-7xl">
        <aside className="border-border hidden w-56 shrink-0 border-r md:block print:!hidden">
          <div className="sticky top-16">
            <AdminSidebar
              owner={session.user.role === "owner"}
              labels={account}
            />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
