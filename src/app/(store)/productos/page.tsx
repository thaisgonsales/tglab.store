import type { Metadata } from "next";

import { ProductCard } from "@/components/store/product-card";
import { listPublishedProducts } from "@/server/services/catalog-service";

export const metadata: Metadata = {
  title: "Productos",
  description: "Catálogo de productos TG LAB fabricados mediante impresión 3D.",
};

export default async function ProductsPage() {
  const products = await listPublishedProducts({ take: 48 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
      <p className="text-foreground-muted mt-1 text-sm">
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </p>

      {products.length === 0 ? (
        <div className="rounded-card border-border text-foreground-muted mt-10 border border-dashed p-10 text-center text-sm">
          Todavía no hay productos publicados.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="text-foreground-muted mt-10 text-xs">
        Los filtros, la búsqueda y el ordenamiento se incorporan en la Fase 5.
      </p>
    </div>
  );
}
