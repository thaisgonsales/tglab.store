"use client";

import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/lib/use-action";
import {
  deleteCategory,
  reorderCategories,
} from "@/server/actions/category-actions";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";

export type FlatCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  productCount: number;
};

type Node = FlatCategory & { children?: FlatCategory[] };

export function CategoryManager({
  roots,
  allOptions,
}: {
  roots: Node[];
  allOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const reorder = useAction(reorderCategories, {
    onSuccess: () => router.refresh(),
  });

  function move(list: FlatCategory[], index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    void reorder.run(next.map((c) => c.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryFormDialog
          parents={allOptions}
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Nueva categoría
            </Button>
          }
        />
      </div>

      {roots.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-8 text-center text-sm">
          Aún no hay categorías. Crea la primera con el botón de arriba.
        </p>
      ) : (
        <ul className="space-y-2">
          {roots.map((root, i) => (
            <li
              key={root.id}
              className="rounded-card border-border bg-surface border"
            >
              <CategoryRow
                category={root}
                parents={allOptions}
                onMoveUp={() => move(roots, i, -1)}
                onMoveDown={() => move(roots, i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < roots.length - 1}
              />
              {root.children && root.children.length > 0 && (
                <ul className="border-border border-t">
                  {root.children.map((child, ci) => (
                    <li key={child.id} className="pl-8">
                      <CategoryRow
                        category={child}
                        parents={allOptions}
                        nested
                        onMoveUp={() => move(root.children!, ci, -1)}
                        onMoveDown={() => move(root.children!, ci, 1)}
                        canMoveUp={ci > 0}
                        canMoveDown={ci < root.children!.length - 1}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  parents,
  nested = false,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  category: FlatCategory;
  parents: { id: string; name: string }[];
  nested?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const del = useAction(deleteCategory, {
    successMessage: "Categoría eliminada",
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Subir"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className="text-foreground-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Bajar"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className="text-foreground-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          {!category.isActive && <Badge variant="warning">Inactiva</Badge>}
          {nested && <Badge variant="neutral">subcategoría</Badge>}
        </div>
        <p className="text-foreground-muted truncate text-xs">
          /{category.slug} · {category.productCount} producto(s)
        </p>
      </div>

      <CategoryFormDialog
        category={category}
        parents={parents}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDialog
        title={`Eliminar "${category.name}"`}
        description="Esta acción no se puede deshacer. Solo es posible si la categoría no tiene productos ni subcategorías."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => del.run(category.id)}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Eliminar">
            <Trash2 className="size-4 text-red-600" />
          </Button>
        }
      />
    </div>
  );
}
