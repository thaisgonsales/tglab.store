"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminMobileNav({
  owner,
  labels,
  menuLabel,
}: {
  owner: boolean;
  labels: {
    security: string;
    team: string;
    adminOpenMenu: string;
    adminCloseMenu: string;
  };
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="border-border bg-surface sticky top-16 z-10 border-b md:hidden print:hidden">
        <Dialog.Trigger className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Menu className="size-5" />
            {menuLabel}
          </span>
          {open ? (
            <X className="size-5" />
          ) : (
            <span className="text-foreground-muted">
              {labels.adminOpenMenu}
            </span>
          )}
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden print:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="border-border bg-surface fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r shadow-xl md:hidden print:hidden"
        >
          <div className="border-border flex min-h-16 shrink-0 items-center justify-between gap-3 border-b px-4 pt-[env(safe-area-inset-top)]">
            <Dialog.Title className="text-sm font-semibold">
              {menuLabel}
            </Dialog.Title>
            <Dialog.Close
              aria-label={labels.adminCloseMenu}
              className="hover:bg-surface-muted flex size-11 items-center justify-center rounded-md"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <AdminSidebar
              owner={owner}
              labels={labels}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
