import { PageHeader } from "@/components/admin/page-header";
import { NewProductForm } from "@/components/admin/new-product-form";
import { categoryOptions } from "@/server/services/admin-catalog-service";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await categoryOptions();
  if (categories.length === 0) {
    return (
      <div>
        <PageHeader title="Nuevo producto" backHref="/admin/productos" />
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-8 text-sm">
          Primero crea al menos una categoría en{" "}
          <a href="/admin/categorias" className="text-brand underline">
            Categorías
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Nuevo producto"
        description="Crea el producto con lo básico. Luego podrás agregar fotos, videos, variantes y más detalles."
        backHref="/admin/productos"
      />
      <NewProductForm categories={categories} />
    </div>
  );
}
