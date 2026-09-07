import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { requireStaff } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStaff();

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-surface sticky top-0 z-20 flex h-14 items-center justify-between border-b px-4">
        <Link href="/admin" className="font-semibold tracking-tight">
          <span className="text-brand">TG</span> LAB
          <span className="text-foreground-muted ml-2 text-sm font-normal">
            Administración
          </span>
        </Link>
        <AdminUserMenu
          name={session.user.name}
          email={session.user.email}
          role={session.user.role ?? "staff"}
        />
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="border-border hidden w-56 shrink-0 border-r md:block">
          <div className="sticky top-14">
            <AdminSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
