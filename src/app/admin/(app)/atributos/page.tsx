import { PageHeader } from "@/components/admin/page-header";
import { AttributeManager } from "@/components/admin/attribute-manager";
import { listAttributes } from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

export default async function AdminAttributesPage() {
  const attributes = await listAttributes();

  return (
    <div>
      <PageHeader
        title="Atributos"
        description="Define atributos reutilizables (Color, Modelo, Tamaño…) y sus valores. Se usan para crear variantes de productos."
      />
      <AttributeManager
        attributes={attributes.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          productCount: a._count.products,
          values: a.values.map((v) => ({
            id: v.id,
            label: v.label,
            hex: v.hex ?? "",
            imageUrl: v.imageUrl ?? "",
          })),
        }))}
      />
    </div>
  );
}
