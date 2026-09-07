"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  productCreateSchema,
  type ProductCreateInput,
} from "@/lib/schemas/product";
import { useAction } from "@/lib/use-action";
import { createProduct } from "@/server/actions/product-actions";

export function NewProductForm({
  categories,
}: {
  categories: { id: string; label: string; depth: number }[];
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof productCreateSchema>, unknown, ProductCreateInput>(
    {
      resolver: zodResolver(productCreateSchema),
      defaultValues: { status: "DRAFT", stock: 0 },
    },
  );

  const create = useAction(createProduct, {
    successMessage: "Producto creado",
    onSuccess: (data) => router.push(`/admin/productos/${data.id}`),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => create.run(v))}
      className="rounded-card border-border bg-surface space-y-5 border p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre del producto</Label>
        <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select
          id="categoryId"
          defaultValue=""
          {...register("categoryId")}
          aria-invalid={!!errors.categoryId}
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat(c.depth * 3)}
              {c.label}
            </option>
          ))}
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Precio (CLP)</Label>
          <Input
            id="price"
            inputMode="numeric"
            placeholder="12990"
            {...register("price")}
            aria-invalid={!!errors.price}
          />
          {errors.price && (
            <p className="text-xs text-red-600">{errors.price.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="compareAtPrice">Precio anterior</Label>
          <Input
            id="compareAtPrice"
            inputMode="numeric"
            placeholder="opcional"
            {...register("compareAtPrice")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min={0}
            {...register("stock")}
            aria-invalid={!!errors.stock}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Estado inicial</Label>
        <Select id="status" {...register("status")}>
          <option value="DRAFT">Borrador (no visible)</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="HIDDEN">Oculto</option>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/productos")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creando…" : "Crear y continuar"}
        </Button>
      </div>
    </form>
  );
}
