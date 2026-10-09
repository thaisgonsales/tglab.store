"use client";

import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttributeFormDialog } from "@/components/admin/attribute-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/lib/use-action";
import {
  addProductColor,
  deleteVariant,
  generateVariants,
  setProductAttributes,
  updateVariant,
} from "@/server/actions/variant-actions";

export type AttributeOption = {
  id: string;
  name: string;
  type: "SELECT" | "COLOR";
  values: { id: string; label: string; hex: string; imageUrl: string }[];
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
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#e88bab");
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
  const addColor = useAction(addProductColor, {
    successMessage: "Color agregado. Ya puedes subir sus fotos.",
    onSuccess: (result) => {
      setAssigned((current) =>
        current.includes(result.attributeId)
          ? current
          : [...current, result.attributeId],
      );
      setColorName("");
      setShowColorForm(false);
      router.refresh();
    },
  });

  const assignedAttrs = useMemo(
    () => allAttributes.filter((a) => assigned.includes(a.id)),
    [allAttributes, assigned],
  );
  const genericAttributes = useMemo(
    () => allAttributes.filter((attribute) => attribute.type !== "COLOR"),
    [allAttributes],
  );
  const hasAdvancedOptions = assignedAttrs.some(
    (attribute) => attribute.type !== "COLOR",
  );
  const activeColors = useMemo(
    () =>
      assignedAttrs
        .filter((attribute) => attribute.type === "COLOR")
        .flatMap((attribute) =>
          attribute.values.filter((value) =>
            variants.some((variant) =>
              variant.optionLabels.some(
                (option) =>
                  option.attribute === attribute.name &&
                  option.value === value.label,
              ),
            ),
          ),
        ),
    [assignedAttrs, variants],
  );
  const duplicateNames = new Set(
    genericAttributes
      .filter(
        (attribute, index) =>
          genericAttributes.findIndex(
            (candidate) =>
              candidate.name.toLocaleLowerCase("es-CL") ===
              attribute.name.toLocaleLowerCase("es-CL"),
          ) !== index,
      )
      .map((attribute) => attribute.name.toLocaleLowerCase("es-CL")),
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
          ? `${res.data.created} opción(es) de venta creada(s)`
          : "Las opciones ya estaban creadas",
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-border rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Colores del producto</p>
            <p className="text-foreground-muted mt-0.5 text-xs">
              Cada color tendrá su propio stock, precio y grupo de fotos.
            </p>
          </div>
          {!showColorForm && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowColorForm(true)}
            >
              <Plus className="size-4" /> Agregar color
            </Button>
          )}
        </div>

        {activeColors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeColors.map((color) => (
              <span
                key={color.id}
                className="border-border inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              >
                <span
                  className="size-4 rounded-full border border-black/10"
                  style={{ backgroundColor: color.hex || "#d4d4d4" }}
                />
                {color.label}
              </span>
            ))}
          </div>
        )}

        {activeColors.length === 0 && !showColorForm && (
          <p className="text-foreground-muted mt-3 text-sm">
            Este producto todavía no tiene colores. Si solo existe en una
            versión, puedes dejarlo así.
          </p>
        )}

        {showColorForm && (
          <div className="border-border bg-surface-muted/40 mt-4 rounded-xl border p-4">
            <p className="text-sm font-medium">Nuevo color</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="text-sm">
                <span className="mb-1 block">Nombre</span>
                <Input
                  value={colorName}
                  onChange={(event) => setColorName(event.target.value)}
                  placeholder="Ej.: Rosado"
                  maxLength={60}
                  autoFocus
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Bolita</span>
                <span className="border-border flex h-10 items-center gap-2 rounded-md border bg-white px-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(event) => setColorHex(event.target.value)}
                    className="size-7 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="Elegir color de la bolita"
                  />
                  <span className="text-foreground-muted text-xs uppercase">
                    {colorHex}
                  </span>
                </span>
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={addColor.isPending || colorName.trim().length === 0}
                  onClick={() =>
                    addColor.run({
                      productId,
                      label: colorName,
                      hex: colorHex,
                    })
                  }
                >
                  {addColor.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Crear color"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={addColor.isPending}
                  onClick={() => setShowColorForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
            <p className="text-foreground-muted mt-2 text-xs">
              Al crearlo aparecerá abajo una fila para su precio y stock, y en
              “Fotos y videos” un bloque exclusivo para sus imágenes.
            </p>
          </div>
        )}
      </div>

      <details className="border-border rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Tamaños, modelos y otras opciones (avanzado)
        </summary>
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Otras opciones</p>
              <p className="text-foreground-muted mt-0.5 text-xs">
                Usa esta sección si el producto también cambia por tamaño,
                modelo u otra característica.
              </p>
            </div>
            <AttributeFormDialog
              trigger={
                <Button type="button" size="sm" variant="outline">
                  <Plus className="size-4" /> Nueva opción
                </Button>
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {genericAttributes.map((a) => {
              const isDuplicate = duplicateNames.has(
                a.name.toLocaleLowerCase("es-CL"),
              );
              const valueSummary = a.values
                .map((value) => value.label)
                .join(", ");

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAttr(a.id)}
                  aria-pressed={assigned.includes(a.id)}
                  className={`inline-flex min-h-10 flex-col items-start justify-center rounded-xl border px-3 py-1.5 text-left text-sm ${
                    assigned.includes(a.id)
                      ? "border-brand bg-brand text-brand-fg"
                      : "border-border hover:bg-surface-muted"
                  }`}
                >
                  <span>{a.name}</span>
                  {isDuplicate && (
                    <span
                      className={`max-w-56 truncate text-[11px] ${
                        assigned.includes(a.id)
                          ? "text-brand-fg/80"
                          : "text-foreground-muted"
                      }`}
                    >
                      {valueSummary || "Sin valores"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {duplicateNames.size > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Hay opciones avanzadas repetidas. Conserva una sola y desmarca el
              duplicado.
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={saveAttrs.isPending}
            onClick={() => saveAttrs.run({ productId, attributeIds: assigned })}
          >
            {saveAttrs.isPending ? "Guardando…" : "Aplicar opciones"}
          </Button>
          {genericAttributes.length === 0 && (
            <p className="text-foreground-muted mt-3 text-xs">
              Aún no hay opciones avanzadas creadas.
            </p>
          )}
        </div>
      </details>

      {hasAdvancedOptions && (
        <div className="border-border rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">
            Elige los valores disponibles para este producto
          </p>
          <p className="text-foreground-muted -mt-2 mb-3 text-xs">
            Por ejemplo, marca Rosado y Verde. Al crear las opciones aparecerá
            una tarjeta de fotos para cada color en el paso siguiente.
          </p>
          <div className="space-y-3">
            {assignedAttrs.map((a) => (
              <div key={a.id}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-foreground-muted text-xs uppercase">
                    {a.name}
                  </p>
                  <AttributeFormDialog
                    attribute={{ ...a, productCount: 1 }}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        {a.type === "COLOR"
                          ? "Editar nombres y colores"
                          : "Editar valores"}
                      </Button>
                    }
                  />
                </div>
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
              Crear {comboCount > 0 ? `${comboCount} ` : ""}opciones de venta
            </Button>
            <span className="text-foreground-muted text-xs">
              Las opciones que ya existen se conservan.
            </span>
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-surface-muted text-foreground-muted border-b text-left text-xs uppercase">
                <th className="p-2">Opción</th>
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
