"use client";

import { Loader2, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/lib/use-action";
import {
  deleteVariant,
  generateVariants,
  setProductAttributes,
  updateVariant,
} from "@/server/actions/variant-actions";

export type AttributeOption = {
  id: string;
  name: string;
  type: "SELECT" | "COLOR";
  values: { id: string; label: string; hex: string }[];
};

export type VariantRow = {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  weightGrams: number | null;
  isActive: boolean;
  optionLabels: { attribute: string; value: string; hex: string | null }[];
  hasSales: boolean;
};

export function VariantsSection({
  productId,
  allAttributes,
  assignedAttributeIds,
  variants,
}: {
  productId: string;
  allAttributes: AttributeOption[];
  assignedAttributeIds: string[];
  variants: VariantRow[];
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<string[]>(assignedAttributeIds);
  const [selection, setSelection] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const a of allAttributes) {
      if (assignedAttributeIds.includes(a.id)) {
        init[a.id] = a.values
          .filter((v) =>
            variants.some((vr) =>
              vr.optionLabels.some((ol) => ol.value === v.label),
            ),
          )
          .map((v) => v.id);
      }
    }
    return init;
  });

  const saveAttrs = useAction(setProductAttributes, {
    successMessage: "Atributos actualizados",
    onSuccess: () => router.refresh(),
  });
  const generate = useAction(generateVariants, {
    onSuccess: () => router.refresh(),
  });

  const assignedAttrs = useMemo(
    () => allAttributes.filter((a) => assigned.includes(a.id)),
    [allAttributes, assigned],
  );

  function toggleAttr(id: string) {
    setAssigned((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleValue(attrId: string, valueId: string) {
    setSelection((prev) => {
      const cur = prev[attrId] ?? [];
      return {
        ...prev,
        [attrId]: cur.includes(valueId)
          ? cur.filter((x) => x !== valueId)
          : [...cur, valueId],
      };
    });
  }

  const comboCount = assignedAttrs.reduce(
    (acc, a) => acc * Math.max(1, (selection[a.id] ?? []).length),
    assignedAttrs.length ? 1 : 0,
  );

  async function handleGenerate() {
    const sel = assignedAttrs
      .map((a) => ({ attributeId: a.id, valueIds: selection[a.id] ?? [] }))
      .filter((s) => s.valueIds.length > 0);
    if (sel.length === 0) return;
    const res = await generate.run({ productId, selection: sel });
    if (res.ok && "created" in res.data) {
      const { toast } = await import("sonner");
      toast.success(
        res.data.created > 0
          ? `${res.data.created} combinación(es) creada(s)`
          : "No hay combinaciones nuevas",
      );
    }
  }

  if (allAttributes.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Primero crea atributos (Color, Modelo…) en{" "}
        <a href="/admin/atributos" className="text-brand underline">
          Atributos
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">
          ¿Qué atributos tiene este producto?
        </p>
        <div className="flex flex-wrap gap-2">
          {allAttributes.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAttr(a.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                assigned.includes(a.id)
                  ? "border-brand bg-brand text-brand-fg"
                  : "border-border hover:bg-surface-muted"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={saveAttrs.isPending}
          onClick={() => saveAttrs.run({ productId, attributeIds: assigned })}
        >
          {saveAttrs.isPending ? "Guardando…" : "Guardar atributos"}
        </Button>
      </div>

      {assignedAttrs.length > 0 && (
        <div className="border-border rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">
            Elige los valores y genera las combinaciones
          </p>
          <div className="space-y-3">
            {assignedAttrs.map((a) => (
              <div key={a.id}>
                <p className="text-foreground-muted mb-1 text-xs uppercase">
                  {a.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {a.values.map((v) => {
                    const on = (selection[a.id] ?? []).includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleValue(a.id, v.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                          on
                            ? "border-brand bg-brand/10"
                            : "border-border hover:bg-surface-muted"
                        }`}
                      >
                        {a.type === "COLOR" && v.hex && (
                          <span
                            className="size-3 rounded-full border border-black/10"
                            style={{ backgroundColor: v.hex }}
                          />
                        )}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={generate.isPending || comboCount === 0}
              onClick={handleGenerate}
            >
              {generate.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Generar {comboCount > 0 ? `${comboCount} ` : ""}combinaciones
            </Button>
            <span className="text-foreground-muted text-xs">
              Las combinaciones existentes se conservan.
            </span>
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-surface-muted text-foreground-muted border-b text-left text-xs uppercase">
                <th className="p-2">Combinación</th>
                <th className="p-2">SKU</th>
                <th className="p-2">Precio</th>
                <th className="p-2">Oferta</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Activa</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <VariantEditRow key={v.id} variant={v} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VariantEditRow({ variant }: { variant: VariantRow }) {
  const router = useRouter();
  const [sku, setSku] = useState(variant.sku);
  const [price, setPrice] = useState(String(variant.price));
  const [compareAt, setCompareAt] = useState(
    variant.compareAtPrice ? String(variant.compareAtPrice) : "",
  );
  const [stock, setStock] = useState(String(variant.stock));
  const [isActive, setIsActive] = useState(variant.isActive);

  const update = useAction(
    (input: Parameters<typeof updateVariant>[1]) =>
      updateVariant(variant.id, input),
    { successMessage: "Variante guardada", onSuccess: () => router.refresh() },
  );
  const del = useAction(deleteVariant, {
    successMessage: "Combinación eliminada",
    onSuccess: () => router.refresh(),
  });

  const dirty =
    sku !== variant.sku ||
    price !== String(variant.price) ||
    compareAt !==
      (variant.compareAtPrice ? String(variant.compareAtPrice) : "") ||
    stock !== String(variant.stock) ||
    isActive !== variant.isActive;

  return (
    <tr className="border-border border-b last:border-0">
      <td className="p-2">
        <div className="flex flex-wrap items-center gap-1">
          {variant.optionLabels.map((ol) => (
            <Badge key={ol.attribute} variant="outline">
              {ol.hex && (
                <span
                  className="mr-1 size-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: ol.hex }}
                />
              )}
              {ol.value}
            </Badge>
          ))}
        </div>
      </td>
      <td className="p-2">
        <Input
          className="h-8 w-32"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
      </td>
      <td className="p-2">
        <Input
          className="h-8 w-24"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td className="p-2">
        <Input
          className="h-8 w-24"
          inputMode="numeric"
          placeholder="—"
          value={compareAt}
          onChange={(e) => setCompareAt(e.target.value)}
        />
      </td>
      <td className="p-2">
        <Input
          className="h-8 w-20"
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </td>
      <td className="p-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </td>
      <td className="p-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={dirty ? "primary" : "ghost"}
            disabled={!dirty || update.isPending}
            onClick={() =>
              update.run({
                sku,
                price,
                compareAtPrice: compareAt || null,
                stock,
                isActive,
              })
            }
          >
            {update.isPending ? "…" : "Guardar"}
          </Button>
          {!variant.hasSales && (
            <ConfirmDialog
              title="Eliminar combinación"
              description={`${variant.optionLabels.map((o) => o.value).join(" / ")}. Esta combinación dejará de existir.`}
              confirmLabel="Eliminar"
              destructive
              onConfirm={() => del.run(variant.id)}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar combinación"
                >
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              }
            />
          )}
        </div>
      </td>
    </tr>
  );
}
