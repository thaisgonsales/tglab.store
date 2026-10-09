"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  PackageCheck,
  Palette,
  PencilLine,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { PageHeader } from "@/components/admin/page-header";
import { MediaManager, type MediaItem } from "@/components/admin/media-manager";
import {
  VariantsSection,
  type AttributeOption,
  type VariantRow,
} from "@/components/admin/variants-section";
import {
  CustomFieldsSection,
  type CustomFieldRow,
} from "@/components/admin/custom-fields-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  setProductCustomizable,
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
  isCustomizable: boolean;
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
  archived: boolean;
  categoryIds: string[];
  primaryCategoryId?: string;
};

export function ProductEditor({
  product,
  media,
  categories,
  allAttributes,
  assignedAttributeIds,
  usedAttributeValueIds,
  variants,
  customFields,
}: {
  product: ProductData;
  media: MediaItem[];
  categories: { id: string; label: string; depth: number }[];
  allAttributes: AttributeOption[];
  assignedAttributeIds: string[];
  usedAttributeValueIds: string[];
  variants: VariantRow[];
  customFields: CustomFieldRow[];
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
    {
      successMessage: product.archived
        ? "Producto restaurado"
        : "Producto archivado",
      onSuccess: () => router.refresh(),
    },
  );
  const del = useAction(() => deleteProduct(product.id), {
    onSuccess: () => router.push("/admin/productos"),
  });
  const customizable = useAction(
    (enabled: boolean) => setProductCustomizable(product.id, enabled),
    { successMessage: "Sección Personalizados actualizada" },
  );

  const categoryIds = watch("categoryIds") ?? [];
  const primaryCategoryId = watch("primaryCategoryId");
  const status = watch("status");
  const isFeatured = watch("isFeatured") ?? false;
  const allowsShipping = watch("allowsShipping") ?? true;
  const allowsPickup = watch("allowsPickup") ?? true;

  const stepStatus = [
    Boolean(product.name && product.categoryIds.length > 0),
    product.type === "SIMPLE" ? product.price > 0 : variants.length > 0,
    media.some((item) => item.type === "IMAGE"),
    Boolean(
      (product.allowsShipping || product.allowsPickup) &&
      product.status !== "DRAFT",
    ),
  ];

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

      <div
        className="mb-6 grid grid-cols-4 gap-2"
        aria-label="Progreso del producto"
      >
        {[
          { label: "Información", icon: PencilLine },
          { label: "Opciones", icon: Palette },
          { label: "Fotos", icon: ImageIcon },
          { label: "Publicación", icon: PackageCheck },
        ].map(({ label, icon: Icon }, index) => (
          <a
            key={label}
            href={`#paso-${index + 1}`}
            className="border-border bg-surface hover:border-brand/40 flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors"
          >
            <span
              className={`flex size-7 items-center justify-center rounded-full ${
                stepStatus[index]
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-surface-muted text-foreground-muted"
              }`}
            >
              {stepStatus[index] ? (
                <Check className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <span className="truncate text-xs font-medium">{label}</span>
          </a>
        ))}
      </div>

      <form
        onSubmit={handleSubmit((v) => save.run(v))}
        className="space-y-5 pb-24"
      >
        <EditorStep
          id="paso-1"
          number={1}
          title="Información del producto"
          description="Lo esencial que verá el cliente en la tienda."
          complete={stepStatus[0]!}
        >
          <div className="space-y-4">
            <Field label="Nombre" error={errors.name?.message}>
              <Input {...register("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field
              label="Descripción breve"
              error={errors.shortDescription?.message}
            >
              <Textarea
                rows={2}
                placeholder="Una frase clara para presentar el producto"
                {...register("shortDescription")}
              />
            </Field>
            <Field label="Descripción completa">
              <Textarea
                rows={6}
                placeholder="Materiales, usos, contenido y detalles importantes"
                {...register("description")}
              />
            </Field>

            <div>
              <Label>Categorías</Label>
              <p className="text-foreground-muted mb-2 text-xs">
                Puedes elegir varias y marcar una como principal.
              </p>
              {errors.categoryIds && (
                <p className="mb-2 text-xs text-red-600">
                  {errors.categoryIds.message}
                </p>
              )}
              <ul className="border-border max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
                {categories.map((c) => {
                  const checked = categoryIds.includes(c.id);
                  return (
                    <li
                      key={c.id}
                      className="hover:bg-surface-muted flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
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
                          className={`text-xs ${primaryCategoryId === c.id ? "text-brand font-medium" : "text-foreground-muted"}`}
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
            </div>

            <details className="border-border rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                Identificadores avanzados
                <ChevronDown className="size-4" />
              </summary>
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <Field
                  label="Dirección web (slug)"
                  error={errors.slug?.message}
                >
                  <Input {...register("slug")} aria-invalid={!!errors.slug} />
                </Field>
                <Field label="SKU interno" error={errors.sku?.message}>
                  <Input {...register("sku")} />
                </Field>
              </div>
            </details>
          </div>
        </EditorStep>

        <EditorStep
          id="paso-2"
          number={2}
          title="Precio, stock y opciones"
          description={
            product.type === "SIMPLE"
              ? "Producto sin colores, tamaños ni modelos diferentes."
              : "Cada combinación puede tener su propio precio y stock."
          }
          complete={stepStatus[1]!}
        >
          <div className="space-y-5">
            {product.type === "SIMPLE" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Precio (CLP)" error={errors.price?.message}>
                  <Input
                    inputMode="numeric"
                    {...register("price")}
                    aria-invalid={!!errors.price}
                  />
                </Field>
                <Field label="Precio anterior (opcional)">
                  <Input inputMode="numeric" {...register("compareAtPrice")} />
                </Field>
                <Field label="Stock" error={errors.stock?.message}>
                  <Input type="number" min={0} {...register("stock")} />
                </Field>
              </div>
            ) : (
              <div className="bg-brand/5 border-brand/15 rounded-xl border p-3 text-sm">
                Edita el precio y el stock directamente en cada combinación.
              </div>
            )}

            <VariantsSection
              productId={product.id}
              allAttributes={allAttributes}
              assignedAttributeIds={assignedAttributeIds}
              variants={variants}
            />

            <details className="border-border rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                Alertas de inventario
                <ChevronDown className="size-4" />
              </summary>
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <Field label="Avisar cuando queden">
                  <Input
                    type="number"
                    min={0}
                    {...register("lowStockThreshold")}
                  />
                </Field>
                <Field label="Mostrar “Últimas unidades” cuando queden">
                  <Input
                    type="number"
                    min={0}
                    {...register("lastUnitsThreshold")}
                  />
                </Field>
              </div>
            </details>
          </div>
        </EditorStep>

        <EditorStep
          id="paso-3"
          number={3}
          title="Fotos y videos"
          description="Arrastra las fotos, ordénalas y asígnalas a un color cuando corresponda."
          complete={stepStatus[2]!}
        >
          <MediaManager
            productId={product.id}
            initialMedia={media}
            variants={variants.map((variant) => ({
              id: variant.id,
              label: variant.optionLabels
                .map((option) => `${option.attribute}: ${option.value}`)
                .join(" · "),
            }))}
            colors={allAttributes
              .filter(
                (attribute) =>
                  attribute.type === "COLOR" &&
                  assignedAttributeIds.includes(attribute.id),
              )
              .flatMap((attribute) =>
                attribute.values
                  .map((value) => ({
                    id: value.id,
                    label: value.label,
                    hex: value.hex || null,
                  }))
                  .filter((value) => usedAttributeValueIds.includes(value.id)),
              )}
          />
        </EditorStep>

        <EditorStep
          id="paso-4"
          number={4}
          title="Preparación, entrega y publicación"
          description="Completa lo necesario para cobrar y despachar correctamente."
          complete={stepStatus[3]!}
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Material">
                <Input placeholder="Ej. PLA" {...register("material")} />
              </Field>
              <Field label="Medidas del producto">
                <Input
                  placeholder="10 × 8 × 4 cm"
                  {...register("dimensions")}
                />
              </Field>
              <Field label="Peso del producto (g)">
                <Input type="number" min={0} {...register("weightGrams")} />
              </Field>
              <Field label="Peso embalado para cotizar el envío (g)">
                <Input
                  type="number"
                  min={0}
                  {...register("packageWeightGrams")}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleRow
                label="Enviar a domicilio o sucursal"
                checked={allowsShipping}
                onChange={(v) =>
                  setValue("allowsShipping", v, { shouldDirty: true })
                }
              />
              <ToggleRow
                label="Permitir retiro coordinado"
                checked={allowsPickup}
                onChange={(v) =>
                  setValue("allowsPickup", v, { shouldDirty: true })
                }
              />
            </div>

            <div className="border-border rounded-xl border p-4">
              <ToggleRow
                label="Este producto permite personalización"
                checked={product.isCustomizable}
                onChange={(enabled) => customizable.run(enabled)}
              />
              <p className="text-foreground-muted mt-2 text-xs">
                Agrega aquí nombres, textos, medidas o instrucciones que el
                cliente debe completar.
              </p>
              <div className="mt-4">
                <CustomFieldsSection
                  productId={product.id}
                  initial={customFields}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Visibilidad">
                <Select {...register("status")}>
                  <option value="DRAFT">
                    Borrador — solo visible en el panel
                  </option>
                  <option value="PUBLISHED">
                    Publicado — visible en la tienda
                  </option>
                  <option value="HIDDEN">
                    Oculto — conserva el enlace, no aparece en listados
                  </option>
                </Select>
              </Field>
              <ToggleRow
                label="Destacar en inicio"
                checked={isFeatured}
                onChange={(v) =>
                  setValue("isFeatured", v, { shouldDirty: true })
                }
              />
            </div>

            <details className="border-border rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                SEO y buscadores (opcional)
                <ChevronDown className="size-4" />
              </summary>
              <div className="space-y-4 border-t p-4">
                <Field label="Título para Google">
                  <Input {...register("seoTitle")} />
                </Field>
                <Field label="Descripción para Google">
                  <Textarea rows={2} {...register("seoDescription")} />
                </Field>
              </div>
            </details>

            <details className="rounded-xl border border-red-200">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-red-700">
                Archivar o eliminar
                <ChevronDown className="size-4" />
              </summary>
              <div className="flex flex-wrap gap-2 border-t border-red-100 p-4">
                {product.archived ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => archive.run(false)}
                    disabled={archive.isPending}
                  >
                    Restaurar producto
                  </Button>
                ) : (
                  <ConfirmDialog
                    title="Archivar producto"
                    description="El producto se inactivará y dejará de mostrarse en la tienda, pero conservará su historial. Podrás restaurarlo."
                    confirmLabel="Archivar"
                    onConfirm={() => archive.run(true)}
                    trigger={
                      <Button type="button" variant="outline">
                        Archivar / remover
                      </Button>
                    }
                  />
                )}
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
              </div>
            </details>
          </div>
        </EditorStep>

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

function EditorStep({
  id,
  number,
  title,
  description,
  complete,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-card border-border bg-surface scroll-mt-6 border shadow-[0_8px_24px_rgba(41,39,45,.035)]"
    >
      <div className="border-border flex items-start gap-3 border-b px-5 py-4">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            complete
              ? "bg-emerald-100 text-emerald-700"
              : "bg-brand/10 text-brand"
          }`}
        >
          {complete ? <Check className="size-4" /> : number}
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-foreground-muted mt-0.5 text-sm">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
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
