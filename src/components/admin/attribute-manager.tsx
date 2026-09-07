"use client";

import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAction } from "@/lib/use-action";
import { deleteAttribute } from "@/server/actions/attribute-actions";
import { AttributeFormDialog } from "@/components/admin/attribute-form-dialog";

export type AttributeData = {
  id: string;
  name: string;
  type: "SELECT" | "COLOR";
  productCount: number;
  values: { id: string; label: string; hex: string; imageUrl: string }[];
};

export function AttributeManager({
  attributes,
}: {
  attributes: AttributeData[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AttributeFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Nuevo atributo
            </Button>
          }
        />
      </div>

      {attributes.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-8 text-center text-sm">
          Aún no hay atributos. Crea &ldquo;Color&rdquo; o &ldquo;Modelo&rdquo;
          para empezar.
        </p>
      ) : (
        <ul className="space-y-3">
          {attributes.map((attr) => (
            <li
              key={attr.id}
              className="rounded-card border-border bg-surface border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{attr.name}</span>
                    <Badge
                      variant={attr.type === "COLOR" ? "brand" : "neutral"}
                    >
                      {attr.type === "COLOR" ? (
                        <>
                          <Palette className="mr-1 size-3" />
                          color
                        </>
                      ) : (
                        "selección"
                      )}
                    </Badge>
                  </div>
                  <p className="text-foreground-muted mt-0.5 text-xs">
                    {attr.values.length} valor(es) · {attr.productCount}{" "}
                    producto(s)
                  </p>
                </div>
                <div className="flex gap-1">
                  <AttributeFormDialog
                    attribute={attr}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Editar">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteAttribute id={attr.id} name={attr.name} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {attr.values.map((v) => (
                  <span
                    key={v.id}
                    className="border-border inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
                  >
                    {attr.type === "COLOR" && v.hex && (
                      <span
                        className="size-3 rounded-full border border-black/10"
                        style={{ backgroundColor: v.hex }}
                      />
                    )}
                    {v.label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteAttribute({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const del = useAction(deleteAttribute, {
    successMessage: "Atributo eliminado",
    onSuccess: () => router.refresh(),
  });
  return (
    <ConfirmDialog
      title={`Eliminar atributo "${name}"`}
      description="Solo es posible si ningún producto lo usa."
      confirmLabel="Eliminar"
      destructive
      onConfirm={() => del.run(id)}
      trigger={
        <Button variant="ghost" size="icon" aria-label="Eliminar">
          <Trash2 className="size-4 text-red-600" />
        </Button>
      }
    />
  );
}
