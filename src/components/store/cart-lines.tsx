"use client";

import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { trackRemoveFromCart, trackViewCart } from "@/lib/analytics";
import { formatCLP } from "@/lib/money";
import type { CartLine } from "@/server/services/cart-service";
import {
  clearCart,
  removeCartLine,
  updateCartLine,
} from "@/server/actions/cart-actions";

export function CartLines({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isClearing, startClear] = useTransition();

  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || lines.length === 0) return;
    viewedRef.current = true;
    const value = lines.reduce((acc, l) => acc + l.lineTotal, 0);
    trackViewCart(
      value,
      lines.map((l) => ({
        id: l.productId ?? l.variantId,
        name: l.productName,
        price: l.unitPrice,
        quantity: l.quantity,
        variant: l.variantLabel,
      })),
    );
  }, [lines]);

  async function setQty(line: CartLine, quantity: number) {
    setPendingId(line.id);
    const result = await updateCartLine({ lineId: line.id, quantity });
    setPendingId(null);
    if (!result.ok) toast.error(result.error);
    router.refresh();
  }

  async function remove(id: string) {
    const line = lines.find((l) => l.id === id);
    setPendingId(id);
    const result = await removeCartLine(id);
    setPendingId(null);
    if (result.ok) {
      toast.success("Producto quitado");
      if (line) {
        trackRemoveFromCart({
          id: line.productId ?? line.variantId,
          name: line.productName,
          price: line.unitPrice,
          quantity: line.quantity,
        });
      }
    } else toast.error(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ul className="divide-border rounded-card border-border bg-surface divide-y border">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-4 p-4">
            <span className="bg-surface-muted relative size-20 shrink-0 overflow-hidden rounded-md">
              {line.imageUrl && (
                <Image
                  src={line.imageUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {line.productSlug ? (
                    <Link
                      href={`/producto/${line.productSlug}`}
                      className="hover:text-brand line-clamp-2 text-sm font-medium"
                    >
                      {line.productName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">
                      {line.productName}
                    </span>
                  )}
                  {line.variantLabel && (
                    <p className="text-foreground-muted text-xs">
                      {line.variantLabel}
                    </p>
                  )}
                  {line.customizations.length > 0 && (
                    <ul className="text-foreground-muted mt-1 text-xs">
                      {line.customizations.map((c) => (
                        <li key={c.label}>
                          <span className="font-medium">{c.label}:</span>{" "}
                          {c.value}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!line.available && (
                    <p className="mt-1 text-xs text-amber-700">
                      {line.maxStock <= 0
                        ? "Sin stock"
                        : `Solo quedan ${line.maxStock}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Quitar"
                  onClick={() => remove(line.id)}
                  disabled={pendingId === line.id}
                  className="text-foreground-muted hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="border-border flex items-center rounded-md border">
                  <button
                    type="button"
                    className="px-2.5 py-1 disabled:opacity-40"
                    onClick={() => setQty(line, line.quantity - 1)}
                    disabled={pendingId === line.id || line.quantity <= 1}
                    aria-label="Menos"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">
                    {pendingId === line.id ? (
                      <Loader2 className="mx-auto size-3 animate-spin" />
                    ) : (
                      line.quantity
                    )}
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-1 disabled:opacity-40"
                    onClick={() => setQty(line, line.quantity + 1)}
                    disabled={
                      pendingId === line.id || line.quantity >= line.maxStock
                    }
                    aria-label="Más"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCLP(line.lineTotal)}
                  </p>
                  {line.compareAtUnitPrice && (
                    <p className="text-foreground-muted text-xs line-through">
                      {formatCLP(line.compareAtUnitPrice * line.quantity)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/productos">← Seguir comprando</Link>
        </Button>
        <ConfirmDialog
          title="Vaciar carrito"
          description="Se quitarán todos los productos del carrito."
          confirmLabel="Vaciar"
          destructive
          onConfirm={() =>
            startClear(async () => {
              const r = await clearCart();
              if (r.ok) toast.success("Carrito vaciado");
              router.refresh();
            })
          }
          trigger={
            <Button variant="ghost" size="sm" disabled={isClearing}>
              Vaciar carrito
            </Button>
          }
        />
      </div>
    </div>
  );
}
