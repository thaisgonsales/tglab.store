"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryInputSchema,
  type CategoryInput,
} from "@/lib/schemas/category";
import { useAction } from "@/lib/use-action";
import {
  createCategory,
  updateCategory,
} from "@/server/actions/category-actions";
import type { FlatCategory } from "@/components/admin/category-manager";

export function CategoryFormDialog({
  trigger,
  category,
  parents,
}: {
  trigger: ReactNode;
  category?: FlatCategory;
  parents: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof categoryInputSchema>, unknown, CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      parentId: category?.parentId ?? null,
      isActive: category?.isActive ?? true,
      seoTitle: category?.seoTitle ?? "",
      seoDescription: category?.seoDescription ?? "",
    },
  });

  const save = useAction(
    isEdit
      ? (input: CategoryInput) => updateCategory(category!.id, input)
      : createCategory,
    {
      successMessage: isEdit ? "Categoría actualizada" : "Categoría creada",
      onSuccess: () => {
        setOpen(false);
        reset();
        router.refresh();
      },
    },
  );

  const isActive = watch("isActive");
  const availableParents = parents.filter((p) => p.id !== category?.id);

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
            {isEdit ? "Editar categoría" : "Nueva categoría"}
          </Dialog.Title>

          <form
            onSubmit={handleSubmit((v) => save.run(v))}
            className="mt-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug (URL)</Label>
              <Input
                id="cat-slug"
                placeholder="se genera automáticamente"
                {...register("slug")}
                aria-invalid={!!errors.slug}
              />
              {errors.slug && (
                <p className="text-xs text-red-600">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Categoría superior</Label>
              <Select
                id="cat-parent"
                defaultValue={category?.parentId ?? ""}
                onChange={(e) =>
                  setValue("parentId", e.target.value || null, {
                    shouldValidate: true,
                  })
                }
              >
                <option value="">— Ninguna (categoría principal)</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Descripción</Label>
              <Textarea id="cat-desc" rows={2} {...register("description")} />
            </div>

            <div className="border-border flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-foreground-muted text-xs">
                  Las categorías inactivas no se muestran en la tienda.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
            </div>

            <details className="border-border rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                SEO (opcional)
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-seo-title">Título SEO</Label>
                  <Input id="cat-seo-title" {...register("seoTitle")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-seo-desc">Meta description</Label>
                  <Textarea
                    id="cat-seo-desc"
                    rows={2}
                    {...register("seoDescription")}
                  />
                </div>
              </div>
            </details>

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
