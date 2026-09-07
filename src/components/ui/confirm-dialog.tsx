"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => unknown | Promise<unknown>;
};

/** Diálogo de confirmación para acciones peligrosas (eliminar, cancelar, etc.). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="rounded-card border-border bg-surface fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border p-6 shadow-lg">
          <Dialog.Title className="text-base font-semibold">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-foreground-muted mt-2 text-sm">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              variant={destructive ? "danger" : "primary"}
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? "Procesando…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
