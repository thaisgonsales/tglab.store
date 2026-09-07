"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CL_REGIONS, comunasOf } from "@/data/cl-regions";
import { formatCLP } from "@/lib/money";
import {
  checkoutFormSchema,
  type CheckoutFormValues,
} from "@/lib/schemas/checkout";
import { quoteCheckout } from "@/server/actions/checkout-actions";
import { createOrder } from "@/server/actions/order-actions";
import type { Quote } from "@/server/services/pricing-service";

const IDEMPOTENCY_STORAGE_KEY = "tglab_checkout_key";

function getIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export function CheckoutForm({
  initialQuote,
  shippingEnabled,
  pickup,
}: {
  initialQuote: Quote;
  shippingEnabled: boolean;
  pickup: {
    enabled: boolean;
    instructions: string;
    addressPublic: string;
    city: string;
  };
}) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [quoting, setQuoting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const submitting = useRef(false);
  const idempotencyKey = useRef<string>("");

  useEffect(() => {
    idempotencyKey.current = getIdempotencyKey();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof checkoutFormSchema>, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fulfillmentMethod: pickup.enabled ? "PICKUP" : "SHIPPING",
      createAccount: false,
    },
  });

  const method = watch("fulfillmentMethod");
  const region = watch("region");
  const comuna = watch("comuna");
  const rateId = watch("shippingRateId");
  const couponCode = watch("couponCode");

  // Recotiza cuando cambian los datos que afectan el total.
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (method === "SHIPPING" && (!region || !comuna)) {
        return;
      }
      setQuoting(true);
      const res = await quoteCheckout({
        fulfillmentMethod: method,
        region: method === "SHIPPING" ? region : undefined,
        comuna: method === "SHIPPING" ? comuna : undefined,
        shippingRateId: rateId || undefined,
        couponCode: couponCode || undefined,
      });
      if (!cancelled) {
        if (res.ok) setQuote(res.data);
        setQuoting(false);
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [method, region, comuna, rateId, couponCode]);

  async function onSubmit(values: CheckoutFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setServerError(null);

    const result = await createOrder({
      ...values,
      shippingRateId: values.shippingRateId || undefined,
      idempotencyKey: idempotencyKey.current || crypto.randomUUID(),
    });

    if (result.ok) {
      try {
        sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
      } catch {
        /* noop */
      }
      router.push(`/checkout/pago/${result.data.orderNumber}`);
    } else {
      setServerError(result.error);
      submitting.current = false;
    }
  }

  const comunas = region ? comunasOf(region) : [];
  const busy = isSubmitting || submitting.current;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-8 lg:grid-cols-[1fr_20rem]"
      noValidate
    >
      <div className="space-y-8">
        {/* Contacto */}
        <section className="rounded-card border-border bg-surface border p-5">
          <h2 className="mb-4 text-base font-semibold">Tus datos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Nombre" error={errors.firstName?.message}>
              <Input {...register("firstName")} autoComplete="given-name" />
            </FieldInput>
            <FieldInput label="Apellido" error={errors.lastName?.message}>
              <Input {...register("lastName")} autoComplete="family-name" />
            </FieldInput>
            <FieldInput label="RUT" error={errors.rut?.message}>
              <Input {...register("rut")} placeholder="12.345.678-5" />
            </FieldInput>
            <FieldInput label="Teléfono" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
              />
            </FieldInput>
            <div className="sm:col-span-2">
              <FieldInput label="Email" error={errors.email?.message}>
                <Input
                  type="email"
                  {...register("email")}
                  autoComplete="email"
                  placeholder="para enviarte la confirmación"
                />
              </FieldInput>
            </div>
          </div>
        </section>

        {/* Entrega */}
        <section className="rounded-card border-border bg-surface border p-5">
          <h2 className="mb-4 text-base font-semibold">Entrega</h2>
          <div className="flex flex-wrap gap-2">
            {pickup.enabled && (
              <MethodButton
                active={method === "PICKUP"}
                onClick={() => setValue("fulfillmentMethod", "PICKUP")}
                title="Retiro"
                subtitle="Gratis"
              />
            )}
            {shippingEnabled && (
              <MethodButton
                active={method === "SHIPPING"}
                onClick={() => setValue("fulfillmentMethod", "SHIPPING")}
                title="Despacho a domicilio"
                subtitle="Según zona"
              />
            )}
          </div>

          {method === "PICKUP" && (
            <p className="bg-surface-muted text-foreground-muted mt-4 rounded-md p-3 text-sm">
              {pickup.addressPublic || pickup.instructions}
              {pickup.city && ` · ${pickup.city}`}
            </p>
          )}

          {method === "SHIPPING" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FieldInput label="Región" error={errors.region?.message}>
                <Select
                  {...register("region")}
                  onChange={(e) => {
                    setValue("region", e.target.value);
                    setValue("comuna", "");
                    setValue("shippingRateId", undefined);
                  }}
                >
                  <option value="">Elige una región</option>
                  {CL_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.short}
                    </option>
                  ))}
                </Select>
              </FieldInput>
              <FieldInput label="Comuna" error={errors.comuna?.message}>
                <Select {...register("comuna")} disabled={!region}>
                  <option value="">Elige una comuna</option>
                  {comunas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FieldInput>
              <FieldInput label="Calle" error={errors.street?.message}>
                <Input {...register("street")} autoComplete="address-line1" />
              </FieldInput>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Número" error={errors.number?.message}>
                  <Input {...register("number")} />
                </FieldInput>
                <FieldInput label="Depto / casa">
                  <Input {...register("apartment")} />
                </FieldInput>
              </div>
              <FieldInput label="Código postal (opcional)">
                <Input {...register("postalCode")} autoComplete="postal-code" />
              </FieldInput>
              <FieldInput label="Indicaciones (opcional)">
                <Input
                  {...register("addressNotes")}
                  placeholder="Portón negro, etc."
                />
              </FieldInput>

              {/* Opciones de despacho */}
              <div className="sm:col-span-2">
                <Label>Opción de despacho</Label>
                {quote.shippingOptions.length === 0 ? (
                  <p className="mt-1 text-sm text-amber-700">
                    {region && comuna
                      ? "No hay despacho para esa comuna. Prueba con retiro o contáctanos."
                      : "Elige región y comuna para ver las opciones."}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {quote.shippingOptions.map((opt) => (
                      <label
                        key={opt.rateId}
                        className="border-border flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            value={opt.rateId}
                            checked={rateId === opt.rateId}
                            onChange={() =>
                              setValue("shippingRateId", opt.rateId)
                            }
                          />
                          {opt.name}
                          <span className="text-foreground-muted">
                            ({opt.zoneName})
                          </span>
                        </span>
                        <span className="font-medium">
                          {opt.price === 0 ? "Gratis" : formatCLP(opt.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.shippingRateId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.shippingRateId.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-card border-border bg-surface border p-5">
          <h2 className="mb-3 text-base font-semibold">Cupón y notas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput label="Código de cupón (opcional)">
              <Input {...register("couponCode")} placeholder="BIENVENIDO10" />
            </FieldInput>
          </div>
          <div className="mt-3">
            <FieldInput label="Nota para el pedido (opcional)">
              <Textarea rows={2} {...register("customerNote")} />
            </FieldInput>
          </div>
        </section>
      </div>

      {/* Resumen */}
      <aside className="rounded-card border-border bg-surface h-fit border p-5 lg:sticky lg:top-20">
        <h2 className="text-base font-semibold">Tu pedido</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {quote.lines.map((l) => (
            <li key={l.cartItemId} className="flex justify-between gap-2">
              <span className="min-w-0">
                <span className="line-clamp-1">{l.productName}</span>
                <span className="text-foreground-muted">
                  {l.variantLabel ? `${l.variantLabel} · ` : ""}x{l.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatCLP(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="border-border mt-4 space-y-1.5 border-t pt-3 text-sm">
          <Row label="Subtotal" value={formatCLP(quote.subtotal)} />
          {quote.discountTotal > 0 && (
            <Row
              label={`Descuento${quote.appliedCoupon ? ` (${quote.appliedCoupon.code})` : ""}`}
              value={`−${formatCLP(quote.discountTotal)}`}
              accent
            />
          )}
          <Row
            label="Despacho"
            value={
              method === "PICKUP"
                ? "Retiro (gratis)"
                : quote.selectedShipping
                  ? quote.shippingTotal === 0
                    ? "Gratis"
                    : formatCLP(quote.shippingTotal)
                  : "Por calcular"
            }
          />
          <div className="border-border mt-2 flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {quoting ? "…" : formatCLP(quote.grandTotal)}
            </dd>
          </div>
        </dl>

        {serverError && (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" className="mt-4 w-full" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creando pedido…
            </>
          ) : (
            "Continuar al pago"
          )}
        </Button>
        <p className="text-foreground-muted mt-2 text-center text-xs">
          No se te cobra nada todavía. El pago se realiza en el siguiente paso.
        </p>
      </aside>
    </form>
  );
}

function MethodButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border p-3 text-left text-sm ${
        active
          ? "border-brand bg-brand/5"
          : "border-border hover:bg-surface-muted"
      }`}
    >
      <span className="block font-medium">{title}</span>
      <span className="text-foreground-muted block text-xs">{subtitle}</span>
    </button>
  );
}

function FieldInput({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm leading-none font-medium">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${accent ? "text-emerald-600" : "text-foreground-muted"}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
