import type { Metadata } from "next";
import Link from "next/link";

import { CartLines } from "@/components/store/cart-lines";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/money";
import { getCartView } from "@/server/services/cart-service";

export const metadata: Metadata = { title: "Carrito" };

export default async function CartPage() {
  const cart = await getCartView();

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tu carrito</h1>
        <p className="text-foreground-muted mt-3">
          Todavía no agregaste productos.
        </p>
        <Button asChild className="mt-6">
          <Link href="/productos">Ver productos</Link>
        </Button>
      </div>
    );
  }

  const savings = cart.compareAtSubtotal - cart.subtotal;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Tu carrito</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <CartLines lines={cart.lines} />

        <aside className="rounded-card border-border bg-surface h-fit border p-5 lg:sticky lg:top-20">
          <h2 className="text-base font-semibold">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatCLP(cart.subtotal)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt>Ahorro</dt>
                <dd className="tabular-nums">−{formatCLP(savings)}</dd>
              </div>
            )}
            <div className="text-foreground-muted flex justify-between">
              <dt>Despacho</dt>
              <dd>Se calcula en el checkout</dd>
            </div>
            <div className="border-border mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total estimado</dt>
              <dd className="tabular-nums">{formatCLP(cart.subtotal)}</dd>
            </div>
          </dl>

          {cart.hasUnavailable && (
            <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
              Hay productos sin stock o no disponibles. Ajústalos para
              continuar.
            </p>
          )}

          <Button
            asChild
            className="mt-4 w-full"
            size="lg"
            disabled={cart.hasUnavailable || cart.subtotal === 0}
          >
            <Link href="/checkout">Ir a pagar</Link>
          </Button>
          <p className="text-foreground-muted mt-2 text-center text-xs">
            Precios con IVA incluido.
          </p>
        </aside>
      </div>
    </div>
  );
}
