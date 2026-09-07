"use client";

import { Check, Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { trackAddToCart, trackViewItem } from "@/lib/analytics";
import { discountPercent, formatCLP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  availableValueIds,
  resolveVariant,
  type SelectableAttribute,
  type SelectableVariant,
} from "@/lib/variant-select";
import { addToCart } from "@/server/actions/cart-actions";

export type CustomFieldDef = {
  key: string;
  label: string;
  helpText: string | null;
  type: "TEXT_SHORT" | "TEXT_LONG" | "NUMBER" | "SELECT" | "CHECKBOX" | "FILE";
  isRequired: boolean;
  maxLength: number | null;
  options: string[];
};

export function ProductPurchase({
  productId,
  productName,
  attributes,
  variants,
  customFields,
  lowStockThreshold,
  lastUnitsThreshold,
}: {
  productId: string;
  productName: string;
  attributes: SelectableAttribute[];
  variants: SelectableVariant[];
  customFields: CustomFieldDef[];
  lowStockThreshold: number;
  lastUnitsThreshold: number;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    // preselecciona si el atributo tiene un solo valor
    const init: Record<string, string> = {};
    for (const a of attributes) {
      if (a.values.length === 1) init[a.id] = a.values[0]!.id;
    }
    return init;
  });
  const [quantity, setQuantity] = useState(1);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);

  const variant = useMemo(
    () => resolveVariant(variants, selection, attributes),
    [variants, selection, attributes],
  );

  useEffect(() => {
    const from = Math.min(...variants.map((v) => v.price));
    trackViewItem({ id: productId, name: productName, price: from });
  }, [productId, productName, variants]);

  function select(attributeId: string, valueId: string) {
    setSelection((prev) => ({ ...prev, [attributeId]: valueId }));
    setAdded(false);
  }

  const stock = variant?.stock ?? 0;
  const canBuy = Boolean(variant) && stock > 0;
  const needsSelection = attributes.some((a) => !selection[a.id]);

  async function handleAdd() {
    if (!variant) return;
    // valida requeridos en cliente (el server revalida)
    for (const f of customFields) {
      if (f.isRequired && !(custom[f.key] ?? "").trim()) {
        toast.error(`Completa el campo "${f.label}".`);
        return;
      }
    }
    setPending(true);
    const result = await addToCart({
      variantId: variant.id,
      quantity,
      customizations: customFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: custom[f.key] ?? "",
      })),
    });
    setPending(false);
    if (result.ok) {
      setAdded(true);
      toast.success("Agregado al carrito");
      trackAddToCart({
        id: productId,
        name: productName,
        price: variant.price,
        quantity,
      });
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const price = variant?.price ?? Math.min(...variants.map((v) => v.price));
  const compareAt =
    variant?.compareAtPrice && variant.compareAtPrice > variant.price
      ? variant.compareAtPrice
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold">{formatCLP(price)}</span>
        {compareAt && (
          <>
            <span className="text-foreground-muted line-through">
              {formatCLP(compareAt)}
            </span>
            <span className="bg-accent rounded-full px-2 py-0.5 text-xs font-medium text-[#4a2a12]">
              -{discountPercent(compareAt, price)}%
            </span>
          </>
        )}
      </div>

      {/* Selectores de atributo */}
      {attributes.map((attr) => {
        const enabled = availableValueIds(
          attr.id,
          variants,
          selection,
          attributes,
        );
        return (
          <div key={attr.id}>
            <p className="mb-1.5 text-sm font-medium">
              {attr.name}
              {selection[attr.id] && (
                <span className="text-foreground-muted ml-2 font-normal">
                  {attr.values.find((v) => v.id === selection[attr.id])?.label}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {attr.values.map((v) => {
                const isOn = selection[attr.id] === v.id;
                const isDisabled = !enabled.has(v.id) && !isOn;
                if (attr.type === "COLOR") {
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => select(attr.id, v.id)}
                      aria-label={v.label}
                      aria-pressed={isOn}
                      title={v.label}
                      className={cn(
                        "relative size-9 rounded-full border",
                        isOn
                          ? "ring-brand ring-offset-background ring-2 ring-offset-2"
                          : "border-border",
                        isDisabled && "opacity-30",
                      )}
                      style={{ backgroundColor: v.hex ?? "#ccc" }}
                    >
                      {isOn && (
                        <Check className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => select(attr.id, v.id)}
                    aria-pressed={isOn}
                    disabled={isDisabled}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      isOn
                        ? "border-brand bg-brand text-brand-fg"
                        : "border-border hover:bg-surface-muted",
                      isDisabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Campos personalizados */}
      {customFields.length > 0 && (
        <div className="border-border space-y-3 rounded-md border p-3">
          {customFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`cf-${f.key}`}>
                {f.label}
                {f.isRequired && <span className="text-red-600"> *</span>}
              </Label>
              {f.type === "TEXT_LONG" ? (
                <textarea
                  id={`cf-${f.key}`}
                  maxLength={f.maxLength ?? undefined}
                  className="border-border bg-surface flex min-h-16 w-full rounded-md border px-3 py-2 text-sm"
                  value={custom[f.key] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [f.key]: e.target.value }))
                  }
                />
              ) : f.type === "SELECT" ? (
                <Select
                  id={`cf-${f.key}`}
                  value={custom[f.key] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [f.key]: e.target.value }))
                  }
                >
                  <option value="">Elige una opción</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : f.type === "CHECKBOX" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={custom[f.key] === "sí"}
                    onChange={(e) =>
                      setCustom((c) => ({
                        ...c,
                        [f.key]: e.target.checked ? "sí" : "",
                      }))
                    }
                  />
                  {f.helpText || "Sí"}
                </label>
              ) : (
                <Input
                  id={`cf-${f.key}`}
                  type={f.type === "NUMBER" ? "number" : "text"}
                  maxLength={f.maxLength ?? undefined}
                  value={custom[f.key] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [f.key]: e.target.value }))
                  }
                />
              )}
              {f.helpText && f.type !== "CHECKBOX" && (
                <p className="text-foreground-muted text-xs">{f.helpText}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disponibilidad */}
      <p className="text-sm">
        {needsSelection ? (
          <span className="text-foreground-muted">Elige una opción</span>
        ) : !variant ? (
          <span className="text-foreground-muted">
            Esa combinación no está disponible
          </span>
        ) : stock <= 0 ? (
          <span className="text-foreground-muted">Agotado</span>
        ) : stock <= lastUnitsThreshold ? (
          <span className="text-amber-600">¡Últimas {stock} unidades!</span>
        ) : stock <= lowStockThreshold ? (
          <span className="text-amber-600">Pocas unidades</span>
        ) : (
          <span className="text-emerald-600">En stock</span>
        )}
        {variant?.sku && (
          <span className="text-foreground-muted ml-2">SKU: {variant.sku}</span>
        )}
      </p>

      {/* Cantidad + agregar */}
      <div className="flex items-center gap-3">
        <div className="border-border flex items-center rounded-md border">
          <button
            type="button"
            className="px-3 py-2 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Menos"
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            className="px-3 py-2 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
            disabled={quantity >= (stock || 99)}
            aria-label="Más"
          >
            +
          </button>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!canBuy || pending}
          className="flex-1"
          size="lg"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : added ? (
            <Check className="size-4" />
          ) : (
            <ShoppingBag className="size-4" />
          )}
          {added ? "Agregado" : "Agregar al carrito"}
        </Button>
      </div>
    </div>
  );
}
