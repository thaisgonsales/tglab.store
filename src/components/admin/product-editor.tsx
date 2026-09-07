"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { MediaManager, type MediaItem } from "@/components/admin/media-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  productUpdateSchema,
  type ProductUpdateInput,
} from "@/lib/schemas/product";
import { useAction } from "@/lib/use-action";
import {
  archiveProduct,
  deleteProduct,
  updateProduct,
} from "@/server/actions/product-actions";

type ProductData = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  type: "SIMPLE" | "VARIABLE";
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  isFeatured: boolean;
  shortDescription: string;
  description: string;
  material: string;
  dimensions: string;
  weightGrams?: number;
  packageWeightGrams?: number;
  allowsShipping: boolean;
  allowsPickup: boolean;
  lowStockThreshold?: number;
  lastUnitsThreshold?: number;
  seoTitle: string;
  seoDescription: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  categoryIds: string[];
  primaryCategoryId?: string;
};

export function ProductEditor({
  product,
  media,
  categories,
}: {
  product: ProductData;
  media: MediaItem[];
  categories: { id: string; label: string; depth: number }[];
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof productUpdateSchema>, unknown, ProductUpdateInput>(
    {
      resolver: zodResolver(productUpdateSchema),
      defaultValues: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        shortDescription: product.shortDescription,
        description: product.description,
        categoryIds: product.categoryIds,
        primaryCategoryId: product.primaryCategoryId,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        material: product.material,
        dimensions: product.dimensions,
        weightGrams: product.weightGrams,
        packageWeightGrams: product.packageWeightGrams,
        allowsShipping: product.allowsShipping,
        allowsPickup: product.allowsPickup,
        lowStockThreshold: product.lowStockThreshold,
        lastUnitsThreshold: product.lastUnitsThreshold,
        status: product.status,
        isFeatured: product.isFeatured,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
      },
    },
  );

  const save = useAction(
    (input: ProductUpdateInput) => updateProduct(product.id, input),
    {
      successMessage: "Producto guardado",
      onSuccess: () => router.refresh(),
    },
  );
  const archive = useAction(
    (archived: boolean) => archiveProduct(product.id, archived),
    { successMessage: "Producto archivado", onSuccess: () => router.refresh() },
  );
  const del = useAction(() => deleteProduct(product.id), {
    onSuccess: () => router.push("/admin/productos"),
  });

  const categoryIds = watch("categoryIds") ?? [];
  const primaryCategoryId = watch("primaryCategoryId");
  const status = watch("status");
  const isFeatured = watch("isFeatured") ?? false;
  const allowsShipping = watch("allowsShipping") ?? true;
  const allowsPickup = watch("allowsPickup") ?? true;

  function toggleCategory(id: string) {
    const next = categoryIds.includes(id)
      ? categoryIds.filter((c) => c !== id)
      : [...categoryIds, id];
    setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
    if (!next.includes(primaryCategoryId ?? "")) {
      setValue("primaryCategoryId", next[0], { shouldDirty: true });
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={product.name}
        backHref="/admin/productos"
        description={`/producto/${product.slug}`}
        action={
          <>
            <Badge
              variant={
                status === "PUBLISHED"
                  ? "success"
                  : status === "DRAFT"
                    ? "warning"
                    : "neutral"
              }
            >
              {status === "PUBLISHED"
                ? "Publicado"
                : status === "DRAFT"
                  ? "Borrador"
                  : "Oculto"}
            </Badge>
            {status === "PUBLISHED" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/producto/${product.slug}`} target="_blank">
                  Ver <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            )}
          </>
        }
      />

      <form
        onSubmit={handleSubmit((v) => save.run(v))}
        className="space-y-6 pb-24"
      >
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nombre" error={errors.name?.message}>
              <Input {...register("name")} aria-invalid={!!errors.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug" error={errors.slug?.message}>
                <Input {...register("slug")} aria-invalid={!!errors.slug} />
              </Field>
              <Field label="SKU" error={errors.sku?.message}>
                <Input {...register("sku")} />
              </Field>
            </div>
            <Field
              label="Descripción corta"
              error={errors.shortDescription?.message}
            >
              <Textarea rows={2} {...register("shortDescription")} />
            </Field>
            <Field label="Descripción completa">
              <Textarea rows={6} {...register("description")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.categoryIds && (
              <p className="mb-2 text-xs text-red-600">
                {errors.categoryIds.message}
              </p>
            )}
            <ul className="space-y-1">
              {categories.map((c) => {
                const checked = categoryIds.includes(c.id);
                return (
                  <li
                    key={c.id}
                    className="hover:bg-surface-muted flex items-center justify-between gap-2 rounded px-2 py-1"
                    style={{ paddingLeft: `${c.depth * 16 + 8}px` }}
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(c.id)}
                      />
                      {c.label}
                    </label>
                    {checked && (
                      <button
                        type="button"
                        onClick={() =>
                          setValue("primaryCategoryId", c.id, {
                            shouldDirty: true,
                          })
                        }
                        className={`text-xs ${
                          primaryCategoryId === c.id
                            ? "text-brand font-medium"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        {primaryCategoryId === c.id
                          ? "Principal"
                          : "Hacer principal"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {product.type === "SIMPLE" ? (
          <Card>
            <CardHeader>
              <CardTitle>Precio e inventario</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Precio (CLP)" error={errors.price?.message}>
                <Input
                  inputMode="numeric"
                  {...register("price")}
                  aria-invalid={!!errors.price}
                />
              </Field>
              <Field label="Precio anterior">
                <Input inputMode="numeric" {...register("compareAtPrice")} />
              </Field>
              <Field label="Stock" error={errors.stock?.message}>
                <Input type="number" min={0} {...register("stock")} />
              </Field>
              <Field label="Aviso de stock bajo (unidades)">
                <Input
                  type="number"
                  min={0}
                  {...register("lowStockThreshold")}
                />
              </Field>
              <Field label="&ldquo;Últimas unidades&rdquo; (unidades)">
                <Input
                  type="number"
                  min={0}
                  {...register("lastUnitsThreshold")}
                />
              </Field>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Precio e inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground-muted text-sm">
                Este producto tiene variantes. El precio y el stock se editan
                por variante en la sección de variantes (Fase 4).
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Fotos y videos</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaManager productId={product.id} initialMedia={media} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información técnica y despacho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Material">
                <Input {...register("material")} />
              </Field>
              <Field label="Dimensiones">
                <Input
                  placeholder="10 x 8 x 4 cm"
                  {...register("dimensions")}
                />
              </Field>
              <Field label="Peso del producto (g)">
                <Input type="number" min={0} {...register("weightGrams")} />
              </Field>
              <Field label="Peso del paquete (g)">
                <Input
                  type="number"
                  min={0}
                  {...register("packageWeightGrams")}
                />
              </Field>
            </div>
            <ToggleRow
              label="Permite despacho"
              checked={allowsShipping}
              onChange={(v) =>
                setValue("allowsShipping", v, { shouldDirty: true })
              }
            />
            <ToggleRow
              label="Permite retiro"
              checked={allowsPickup}
              onChange={(v) =>
                setValue("allowsPickup", v, { shouldDirty: true })
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibilidad y SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Estado">
              <Select {...register("status")}>
                <option value="DRAFT">Borrador (no visible)</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="HIDDEN">Oculto</option>
              </Select>
            </Field>
            <ToggleRow
              label="Producto destacado (aparece en la home)"
              checked={isFeatured}
              onChange={(v) => setValue("isFeatured", v, { shouldDirty: true })}
            />
            <Field label="Título SEO">
              <Input {...register("seoTitle")} />
            </Field>
            <Field label="Meta description">
              <Textarea rows={2} {...register("seoDescription")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ConfirmDialog
              title="Archivar producto"
              description="El producto deja de mostrarse en la tienda pero se conserva junto a su historial. Podrás restaurarlo."
              confirmLabel="Archivar"
              onConfirm={() => archive.run(true)}
              trigger={
                <Button type="button" variant="outline">
                  Archivar
                </Button>
              }
            />
            <ConfirmDialog
              title="Eliminar producto"
              description="Solo se puede eliminar si nunca tuvo ventas. Si las tuvo, se archivará automáticamente para no perder los pedidos."
              confirmLabel="Eliminar"
              destructive
              onConfirm={() => del.run()}
              trigger={
                <Button type="button" variant="danger">
                  Eliminar
                </Button>
              }
            />
          </CardContent>
        </Card>

        <div className="border-border bg-surface/90 fixed inset-x-0 bottom-0 z-20 border-t p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
            {isDirty && (
              <span className="text-foreground-muted text-xs">
                Cambios sin guardar
              </span>
            )}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="border-border flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
