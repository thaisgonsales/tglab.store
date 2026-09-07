"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCLP } from "@/lib/money";
import { useAction } from "@/lib/use-action";
import {
  createCoupon,
  deleteCoupon,
  setCouponActive,
  updateCoupon,
} from "@/server/actions/coupon-actions";

type Named = { id: string; name: string };
export type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  startsAt: string;
  endsAt: string;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  appliesToProductIds: string[];
  appliesToCategoryIds: string[];
  isActive: boolean;
  uses: number;
};

const TYPE_LABEL: Record<CouponRow["type"], string> = {
  PERCENT: "Porcentaje",
  FIXED: "Monto fijo",
  FREE_SHIPPING: "Envío gratis",
};

function describe(c: CouponRow): string {
  if (c.type === "PERCENT") return `${c.value}% de descuento`;
  if (c.type === "FIXED") return `${formatCLP(c.value)} de descuento`;
  return "Despacho gratis";
}

export function CouponManager({
  coupons,
  products,
  categories,
}: {
  coupons: CouponRow[];
  products: Named[];
  categories: Named[];
}) {
  const router = useRouter();
  const toggle = useAction(
    (args: { id: string; active: boolean }) =>
      setCouponActive(args.id, args.active),
    { onSuccess: () => router.refresh() },
  );
  const del = useAction(deleteCoupon, {
    successMessage: "Cupón eliminado",
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CouponDialog
          products={products}
          categories={categories}
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Nuevo cupón
            </Button>
          }
        />
      </div>

      {coupons.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-8 text-center text-sm">
          Sin cupones todavía.
        </p>
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => (
            <li
              key={c.id}
              className="rounded-card border-border bg-surface flex flex-wrap items-center justify-between gap-3 border p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {c.code}
                  </span>
                  <Badge variant="outline">{TYPE_LABEL[c.type]}</Badge>
                  {!c.isActive && <Badge variant="warning">inactivo</Badge>}
                </div>
                <p className="text-foreground-muted mt-0.5 text-xs">
                  {describe(c)}
                  {c.minSubtotal ? ` · mínimo ${formatCLP(c.minSubtotal)}` : ""}
                  {c.maxUses
                    ? ` · ${c.usedCount}/${c.maxUses} usos`
                    : ` · ${c.usedCount} usos`}
                  {c.endsAt ? ` · vence ${c.endsAt}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={c.isActive}
                  onCheckedChange={(v) => toggle.run({ id: c.id, active: v })}
                />
                <CouponDialog
                  coupon={c}
                  products={products}
                  categories={categories}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <ConfirmDialog
                  title={`Eliminar cupón ${c.code}`}
                  description="Solo si nunca se usó. Si se usó, desactívalo."
                  confirmLabel="Eliminar"
                  destructive
                  onConfirm={() => del.run(c.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Eliminar">
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CouponDialog({
  trigger,
  coupon,
  products,
  categories,
}: {
  trigger: ReactNode;
  coupon?: CouponRow;
  products: Named[];
  categories: Named[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(coupon);

  const [form, setForm] = useState({
    code: coupon?.code ?? "",
    type: coupon?.type ?? ("PERCENT" as CouponRow["type"]),
    value: coupon ? String(coupon.value) : "",
    startsAt: coupon?.startsAt ?? "",
    endsAt: coupon?.endsAt ?? "",
    minSubtotal: coupon?.minSubtotal ? String(coupon.minSubtotal) : "",
    maxUses: coupon?.maxUses ? String(coupon.maxUses) : "",
    maxUsesPerCustomer: coupon?.maxUsesPerCustomer
      ? String(coupon.maxUsesPerCustomer)
      : "",
    isActive: coupon?.isActive ?? true,
  });
  const [productIds, setProductIds] = useState<string[]>(
    coupon?.appliesToProductIds ?? [],
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    coupon?.appliesToCategoryIds ?? [],
  );

  const save = useAction(
    isEdit
      ? (payload: Parameters<typeof updateCoupon>[1]) =>
          updateCoupon(coupon!.id, payload)
      : createCoupon,
    {
      successMessage: isEdit ? "Cupón actualizado" : "Cupón creado",
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
    },
  );

  function submit() {
    save.run({
      code: form.code,
      type: form.type,
      value: form.value || 0,
      startsAt: form.startsAt || "",
      endsAt: form.endsAt || "",
      minSubtotal: form.minSubtotal ? Number(form.minSubtotal) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      maxUsesPerCustomer: form.maxUsesPerCustomer
        ? Number(form.maxUsesPerCustomer)
        : null,
      appliesToProductIds: productIds,
      appliesToCategoryIds: categoryIds,
      isActive: form.isActive,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="rounded-card border-border bg-surface fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border p-6 shadow-lg">
          <Dialog.Title className="text-base font-semibold">
            {isEdit ? "Editar cupón" : "Nuevo cupón"}
          </Dialog.Title>

          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="BIENVENIDO10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as CouponRow["type"],
                    })
                  }
                >
                  <option value="PERCENT">Porcentaje</option>
                  <option value="FIXED">Monto fijo (CLP)</option>
                  <option value="FREE_SHIPPING">Envío gratis</option>
                </Select>
              </div>
            </div>

            {form.type !== "FREE_SHIPPING" && (
              <div className="space-y-1.5">
                <Label>
                  {form.type === "PERCENT" ? "Porcentaje (1-100)" : "Monto CLP"}
                </Label>
                <Input
                  inputMode="numeric"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Inicio (opcional)</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Término (opcional)</Label>
                <Input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Compra mínima (CLP)</Label>
                <Input
                  inputMode="numeric"
                  value={form.minSubtotal}
                  onChange={(e) =>
                    setForm({ ...form, minSubtotal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. usos totales</Label>
                <Input
                  inputMode="numeric"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. usos por cliente</Label>
                <Input
                  inputMode="numeric"
                  value={form.maxUsesPerCustomer}
                  onChange={(e) =>
                    setForm({ ...form, maxUsesPerCustomer: e.target.value })
                  }
                />
              </div>
            </div>

            <details className="border-border rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Restringir a productos o categorías (opcional)
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <MultiPick
                  label="Categorías"
                  items={categories}
                  selected={categoryIds}
                  onChange={setCategoryIds}
                />
                <MultiPick
                  label="Productos"
                  items={products}
                  selected={productIds}
                  onChange={setProductIds}
                />
              </div>
            </details>

            <div className="border-border flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">Activo</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button size="sm" disabled={save.isPending} onClick={submit}>
                Guardar
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MultiPick({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: Named[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="border-border mt-1 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
        {items.length === 0 && (
          <p className="text-foreground-muted text-xs">Nada disponible</p>
        )}
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(it.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, it.id]
                    : selected.filter((s) => s !== it.id),
                )
              }
            />
            {it.name}
          </label>
        ))}
      </div>
    </div>
  );
}
