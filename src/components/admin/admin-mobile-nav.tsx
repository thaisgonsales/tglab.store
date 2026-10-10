"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminMobileNav({
  owner,
  labels,
  menuLabel,
}: {
  owner: boolean;
  labels: { security: string; team: string };
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border bg-surface sticky top-16 z-10 border-b md:hidden print:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-mobile-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <Menu className="size-5" />
          {menuLabel}
        </span>
        {open ? (
          <X className="size-5" />
        ) : (
          <span className="text-foreground-muted">Abrir</span>
        )}
      </button>
      {open && (
        <div
          id="admin-mobile-menu"
          className="max-h-[calc(100dvh-7rem)] overflow-y-auto border-t"
        >
          <AdminSidebar
            owner={owner}
            labels={labels}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
