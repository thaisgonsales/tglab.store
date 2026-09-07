"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  lookupOrderTracking,
  type TrackingView,
} from "@/server/actions/tracking-actions";

export function OrderTracking({ defaultNumber }: { defaultNumber?: string }) {
  const [number, setNumber] = useState(defaultNumber ?? "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TrackingView | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await lookupOrderTracking({ number: number.trim(), email });
    setLoading(false);
    if (result.ok) setView(result.data);
    else {
      setError(result.error);
      setView(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-card border-border bg-surface space-y-4 border p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ot-number">Número de pedido</Label>
            <Input
              id="ot-number"
              placeholder="TG-000001"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ot-email">Email de compra</Label>
            <Input
              id="ot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Consultar
        </Button>
      </form>

      {view && (
        <div className="rounded-card border-border bg-surface space-y-5 border p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Pedido {view.number}</h2>
              <p className="text-foreground-muted text-sm">
                {view.placedAt} · {formatCLP(view.grandTotal)}
              </p>
            </div>
            <span className="bg-surface-muted rounded-full px-3 py-1 text-sm">
              {view.status}
            </span>
          </div>

          {view.needsPayment && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Tu pedido aún no tiene el pago confirmado.{" "}
              <Link
                href={`/checkout/pago/${view.number}`}
                className="font-medium underline"
              >
                Completar el pago
              </Link>
            </div>
          )}

          <ol className="space-y-3">
            {view.steps.map((step) => (
              <li key={step.key} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    step.done
                      ? "border-brand bg-brand text-brand-fg"
                      : step.current
                        ? "border-brand text-brand"
                        : "border-border text-foreground-muted",
                  )}
                >
                  {step.done ? <Check className="size-3" /> : ""}
                </span>
                <span className="text-sm">
                  <span
                    className={cn(
                      step.current && "font-medium",
                      !step.done && !step.current && "text-foreground-muted",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.at && (
                    <span className="text-foreground-muted block text-xs">
                      {step.at}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>

          {view.tracking.number && (
            <div className="border-border rounded-md border p-3 text-sm">
              <p className="font-medium">Seguimiento del envío</p>
              <p className="text-foreground-muted">
                {view.tracking.carrier ?? ""} {view.tracking.number}
              </p>
              {view.tracking.url && (
                <a
                  href={view.tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  Ver en el transportista
                </a>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">Productos</h3>
            <ul className="text-foreground-muted space-y-1 text-sm">
              {view.items.map((it, i) => (
                <li key={i}>
                  {it.quantity} × {it.name}
                  {it.variant ? ` (${it.variant})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
