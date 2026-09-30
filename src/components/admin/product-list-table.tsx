"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Copy, MoreVertical } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCLP } from "@/lib/money";
import { useAction } from "@/lib/use-action";
import {
  archiveProduct,
  deleteProduct,
  duplicateProduct,
  setProductStatus,
} from "@/server/actions/product-actions";

type Item = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  isFeatured: boolean;
  type: "SIMPLE" | "VARIABLE";
  archivedAt: Date | string | null;
  media: { url: string }[];
  variants: { price: number; stock: number }[];
  categories: { category: { name: string } }[];
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  HIDDEN: "Oculto",
  ARCHIVED: "Archivado",
};

export function ProductListTable({
  result,
  categories,
  filters,
}: {
  result: {
    items: Item[];
    total: number;
    page: number;
    pages: number;
  };
  categories: { id: string; label: string; depth: number }[];
  filters: { q: string; status: string; categoria: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filters.q);

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q });
          }}
        >
          <Input
            placeholder="Buscar por nombre, SKU o slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <Select
          className="max-w-[10rem]"
          value={filters.status}
          onChange={(e) => apply({ status: e.target.value })}
        >
          <option value="">Todos los estados</option>
          <option value="PUBLISHED">Publicados</option>
          <option value="DRAFT">Borradores</option>
          <option value="HIDDEN">Ocultos</option>
          <option value="ARCHIVED">Archivados</option>
        </Select>
        <Select
          className="max-w-[12rem]"
          value={filters.categoria}
          onChange={(e) => apply({ categoria: e.target.value })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat(c.depth * 3)}
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-10 text-center text-sm">
          No hay productos que coincidan.
        </p>
      ) : (
        <div className="rounded-card border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-surface-muted text-foreground-muted border-b text-left text-xs uppercase">
                <th className="p-3">Producto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pages > 1 && (
        <Pagination page={result.page} pages={result.pages} />
      )}
    </div>
  );
}

function ProductRow({ product }: { product: Item }) {
  const router = useRouter();
  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const stock = product.variants.reduce((a, v) => a + Math.max(v.stock, 0), 0);
  const archived = Boolean(product.archivedAt);

  const dup = useAction(duplicateProduct, {
    successMessage: "Producto duplicado",
    onSuccess: (data) => router.push(`/admin/productos/${data.id}`),
  });
  const publish = useAction(setProductStatus, {
    successMessage: "Estado actualizado",
    onSuccess: () => router.refresh(),
  });
  const archive = useAction(archiveProduct, {
    successMessage: archived ? "Producto restaurado" : "Producto archivado",
    onSuccess: () => router.refresh(),
  });
  const remove = useAction(deleteProduct, {
    onSuccess: (result) => {
      toast.success(
        result.archived
          ? "El producto tenía ventas y fue archivado"
          : "Producto eliminado",
      );
      router.refresh();
    },
  });

  return (
    <tr className="border-border border-b last:border-0">
      <td className="p-3">
        <Link
          href={`/admin/productos/${product.id}`}
          className="flex items-center gap-3"
        >
          <span className="bg-surface-muted relative size-10 shrink-0 overflow-hidden rounded-md">
            {product.media[0] && (
              <Image
                src={product.media[0].url}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="hover:text-brand block truncate font-medium">
              {product.name}
            </span>
            <span className="text-foreground-muted block truncate text-xs">
              {product.categories[0]?.category.name ?? "Sin categoría"}
              {product.type === "VARIABLE" && " · con variantes"}
              {product.isFeatured && " · destacado"}
            </span>
          </span>
        </Link>
      </td>
      <td className="p-3">
        <Badge
          variant={
            archived
              ? "neutral"
              : product.status === "PUBLISHED"
                ? "success"
                : product.status === "DRAFT"
                  ? "warning"
                  : "neutral"
          }
        >
          {archived ? "Archivado" : STATUS_LABEL[product.status]}
        </Badge>
      </td>
      <td className="p-3 tabular-nums">{formatCLP(minPrice)}</td>
      <td className="p-3 tabular-nums">{stock}</td>
      <td className="p-3 text-right">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Acciones">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="border-border bg-surface z-50 min-w-48 rounded-md border p-1 text-left shadow-lg"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="hover:bg-surface-muted focus:bg-surface-muted block cursor-pointer rounded px-2 py-2 text-sm outline-none"
                >
                  Editar
                </Link>
              </DropdownMenu.Item>
              {!archived && product.status !== "PUBLISHED" && (
                <MenuItem onSelect={() => publish.run(product.id, "PUBLISHED")}>
                  Publicar
                </MenuItem>
              )}
              {!archived && product.status === "PUBLISHED" && (
                <MenuItem onSelect={() => publish.run(product.id, "HIDDEN")}>
                  Inactivar / ocultar
                </MenuItem>
              )}
              <MenuItem onSelect={() => dup.run(product.id)}>
                <Copy className="size-3.5" /> Duplicar
              </MenuItem>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
              <MenuItem
                onSelect={() => archive.run(product.id, !archived)}
              >
                {archived ? "Restaurar" : "Archivar / remover"}
              </MenuItem>
              {!archived && (
                <MenuItem
                  destructive
                  onSelect={() => {
                    if (
                      window.confirm(
                        "¿Eliminar este producto? Si tiene ventas, se archivará para conservar el historial.",
                      )
                    ) {
                      return remove.run(product.id);
                    }
                  }}
                >
                  Eliminar
                </MenuItem>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </td>
    </tr>
  );
}

function MenuItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: React.ReactNode;
  onSelect: () => unknown;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={`focus:bg-surface-muted flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm outline-none ${
        destructive ? "text-red-600" : ""
      }`}
    >
      {children}
    </DropdownMenu.Item>
  );
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link href={href(Math.max(1, page - 1))}>Anterior</Link>
      </Button>
      <span className="text-foreground-muted">
        Página {page} de {pages}
      </span>
      <Button asChild variant="outline" size="sm" disabled={page >= pages}>
        <Link href={href(Math.min(pages, page + 1))}>Siguiente</Link>
      </Button>
    </div>
  );
}
