"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCLP } from "@/lib/money";
import { SORT_LABELS } from "@/lib/catalog-params";

type Facets = {
  categories: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  }[];
  priceMin: number;
  priceMax: number;
  attributes: {
    id: string;
    name: string;
    type: "SELECT" | "COLOR";
    values: { label: string; slug: string; hex: string | null }[];
  }[];
};

export function CatalogControls({
  facets,
  total,
}: {
  facets: Facets;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  function setParam(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("pagina");
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function toggleAttrValue(paramKey: string, slug: string) {
    const current = (params.get(paramKey) ?? "").split(",").filter(Boolean);
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setParam({ [paramKey]: next.join(",") || null });
  }

  const activeCount =
    (params.get("categoria") ? 1 : 0) +
    (params.get("disponible") ? 1 : 0) +
    (params.get("precio_min") || params.get("precio_max") ? 1 : 0) +
    ["color", "modelo", "atributo"].reduce(
      (a, k) => a + (params.get(k) ? params.get(k)!.split(",").length : 0),
      0,
    );

  const sort = params.get("orden") ?? "recomendados";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <SlidersHorizontal className="size-4" />
            Filtros
            {activeCount > 0 && (
              <span className="bg-brand text-brand-fg ml-1 rounded-full px-1.5 text-xs">
                {activeCount}
              </span>
            )}
          </Button>
          <span className="text-foreground-muted text-sm">
            {total} resultados
          </span>
        </div>
        <Select
          className="max-w-[13rem]"
          value={sort}
          onChange={(e) => setParam({ orden: e.target.value })}
          aria-label="Ordenar"
        >
          {Object.entries(SORT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      {open && (
        <div className="rounded-card border-border bg-surface mt-4 grid gap-5 border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {facets.categories.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Categoría</legend>
              <div className="space-y-1 text-sm">
                <button
                  type="button"
                  onClick={() => setParam({ categoria: null })}
                  className={
                    !params.get("categoria")
                      ? "text-brand font-medium"
                      : "text-foreground-muted hover:text-foreground"
                  }
                >
                  Todas
                </button>
                {facets.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setParam({ categoria: c.slug })}
                    className={`block ${
                      params.get("categoria") === c.slug
                        ? "text-brand font-medium"
                        : "text-foreground-muted hover:text-foreground"
                    } ${c.parentId ? "pl-3" : ""}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Precio</legend>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                placeholder={formatCLP(facets.priceMin)}
                defaultValue={params.get("precio_min") ?? ""}
                onBlur={(e) => setParam({ precio_min: e.target.value || null })}
                className="border-border bg-surface h-9 w-24 rounded-md border px-2"
              />
              <span>—</span>
              <input
                type="number"
                placeholder={formatCLP(facets.priceMax)}
                defaultValue={params.get("precio_max") ?? ""}
                onBlur={(e) => setParam({ precio_max: e.target.value || null })}
                className="border-border bg-surface h-9 w-24 rounded-md border px-2"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.get("disponible") === "1"}
                onChange={(e) =>
                  setParam({ disponible: e.target.checked ? "1" : null })
                }
              />
              Solo disponibles
            </label>
          </fieldset>

          {facets.attributes.map((attr) => {
            const paramKey =
              attr.name.toLowerCase() === "color"
                ? "color"
                : attr.name.toLowerCase() === "modelo"
                  ? "modelo"
                  : "atributo";
            const selected = (params.get(paramKey) ?? "")
              .split(",")
              .filter(Boolean);
            return (
              <fieldset key={attr.id}>
                <legend className="mb-2 text-sm font-medium">
                  {attr.name}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {attr.values.map((v) => {
                    const on = selected.includes(v.slug);
                    return (
                      <button
                        key={v.slug}
                        type="button"
                        onClick={() => toggleAttrValue(paramKey, v.slug)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                          on
                            ? "border-brand bg-brand/10"
                            : "border-border hover:bg-surface-muted"
                        }`}
                      >
                        {attr.type === "COLOR" && v.hex && (
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
              </fieldset>
            );
          })}

          {activeCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    pathname + (params.get("q") ? `?q=${params.get("q")}` : ""),
                  )
                }
              >
                <X className="size-4" /> Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
