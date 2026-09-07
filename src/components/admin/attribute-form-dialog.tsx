"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  attributeInputSchema,
  type AttributeInput,
} from "@/lib/schemas/attribute";
import { useAction } from "@/lib/use-action";
import {
  createAttribute,
  updateAttribute,
} from "@/server/actions/attribute-actions";
import type { AttributeData } from "@/components/admin/attribute-manager";

export function AttributeFormDialog({
  trigger,
  attribute,
}: {
  trigger: ReactNode;
  attribute?: AttributeData;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(attribute);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<AttributeInput>({
    resolver: zodResolver(attributeInputSchema),
    defaultValues: {
      name: attribute?.name ?? "",
      type: attribute?.type ?? "SELECT",
      values: attribute?.values.map((v) => ({
        id: v.id,
        label: v.label,
        hex: v.hex,
        imageUrl: v.imageUrl,
      })) ?? [{ label: "", hex: "", imageUrl: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "values" });
  const type = watch("type");

  const save = useAction(
    isEdit
      ? (input: AttributeInput) => updateAttribute(attribute!.id, input)
      : createAttribute,
    {
      successMessage: isEdit ? "Atributo actualizado" : "Atributo creado",
      onSuccess: () => {
        setOpen(false);
        reset();
        router.refresh();
      },
    },
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="rounded-card border-border bg-surface fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border p-6 shadow-lg">
          <Dialog.Title className="text-base font-semibold">
            {isEdit ? "Editar atributo" : "Nuevo atributo"}
          </Dialog.Title>

          <form
            onSubmit={handleSubmit((v) => save.run(v))}
            className="mt-4 space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="attr-name">Nombre</Label>
                <Input
                  id="attr-name"
                  placeholder="Color, Modelo, Tamaño…"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attr-type">Tipo</Label>
                <Select id="attr-type" {...register("type")}>
                  <option value="SELECT">Selección</option>
                  <option value="COLOR">Color (con muestra)</option>
                </Select>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Valores</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => append({ label: "", hex: "", imageUrl: "" })}
                >
                  <Plus className="size-4" /> Agregar valor
                </Button>
              </div>
              {errors.values?.root && (
                <p className="mb-2 text-xs text-red-600">
                  {errors.values.root.message}
                </p>
              )}
              <ul className="space-y-2">
                {fields.map((field, index) => (
                  <li key={field.id} className="flex items-center gap-2">
                    <GripVertical className="text-foreground-muted size-4 shrink-0" />
                    <Input
                      placeholder="Nombre del valor"
                      {...register(`values.${index}.label`)}
                      aria-invalid={!!errors.values?.[index]?.label}
                    />
                    {type === "COLOR" && (
                      <input
                        type="color"
                        aria-label="Color"
                        className="border-border bg-surface h-10 w-12 shrink-0 cursor-pointer rounded-md border"
                        {...register(`values.${index}.hex`)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar valor"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={save.isPending}>
                {save.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
