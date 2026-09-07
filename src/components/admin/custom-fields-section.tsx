"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/lib/use-action";
import { saveCustomFields } from "@/server/actions/custom-field-actions";

type FieldType =
  "TEXT_SHORT" | "TEXT_LONG" | "NUMBER" | "SELECT" | "CHECKBOX" | "FILE";

export type CustomFieldRow = {
  id?: string;
  label: string;
  helpText: string;
  type: FieldType;
  isRequired: boolean;
  maxLength?: number;
  options: string[];
};

const TYPE_LABEL: Record<FieldType, string> = {
  TEXT_SHORT: "Texto corto",
  TEXT_LONG: "Texto largo",
  NUMBER: "Número",
  SELECT: "Selector (opciones)",
  CHECKBOX: "Casilla (sí/no)",
  FILE: "Archivo / imagen",
};

export function CustomFieldsSection({
  productId,
  initial,
}: {
  productId: string;
  initial: CustomFieldRow[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<CustomFieldRow[]>(initial);

  const save = useAction(saveCustomFields, {
    successMessage: "Campos guardados",
    onSuccess: () => router.refresh(),
  });

  function update(i: number, patch: Partial<CustomFieldRow>) {
    setFields((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-foreground-muted text-sm">
        Datos que el cliente completa al comprar (nombre grabado, color de
        texto, etc.). Quedan guardados en el pedido tal como los ingresó.
      </p>

      {fields.map((field, i) => (
        <div key={i} className="border-border space-y-3 rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Etiqueta</Label>
                <Input
                  value={field.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Ej: Texto a grabar"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={field.type}
                  onChange={(e) =>
                    update(i, { type: e.target.value as FieldType })
                  }
                >
                  {Object.entries(TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar campo"
              onClick={() =>
                setFields((prev) => prev.filter((_, idx) => idx !== i))
              }
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Instrucción (opcional)</Label>
            <Input
              value={field.helpText}
              onChange={(e) => update(i, { helpText: e.target.value })}
              placeholder="Ej: máximo 12 caracteres, sin tildes"
            />
          </div>

          {(field.type === "TEXT_SHORT" || field.type === "TEXT_LONG") && (
            <div className="space-y-1.5">
              <Label>Longitud máxima</Label>
              <Input
                type="number"
                min={1}
                value={field.maxLength ?? ""}
                onChange={(e) =>
                  update(i, {
                    maxLength: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          )}

          {field.type === "SELECT" && (
            <div className="space-y-1.5">
              <Label>Opciones (una por línea)</Label>
              <textarea
                className="border-border bg-surface flex min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                value={field.options.join("\n")}
                onChange={(e) =>
                  update(i, {
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          )}

          <div className="border-border flex items-center justify-between rounded-md border p-2">
            <span className="text-sm">Obligatorio</span>
            <Switch
              checked={field.isRequired}
              onCheckedChange={(v) => update(i, { isRequired: v })}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setFields((prev) => [
              ...prev,
              {
                label: "",
                helpText: "",
                type: "TEXT_SHORT",
                isRequired: false,
                options: [],
              },
            ])
          }
        >
          <Plus className="size-4" /> Agregar campo
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={save.isPending}
          onClick={() =>
            save.run({
              productId,
              fields: fields.map((f) => ({
                id: f.id,
                label: f.label,
                helpText: f.helpText || undefined,
                type: f.type,
                isRequired: f.isRequired,
                maxLength: f.maxLength,
                options: f.options,
              })),
            })
          }
        >
          {save.isPending ? "Guardando…" : "Guardar campos"}
        </Button>
      </div>
    </div>
  );
}
