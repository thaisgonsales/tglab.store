import type { Metadata } from "next";
import Link from "next/link";

import { CatalogControls } from "@/components/store/catalog-controls";
import { ProductCard } from "@/components/store/product-card";
import { parseCatalogParams } from "@/lib/catalog-params";
import {
  getCatalogFacets,
  searchCatalog,
} from "@/server/services/catalog-service";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Descubre el catálogo de productos TG LAB para decorar, organizar y disfrutar tus espacios.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseCatalogParams(sp);

  const [result, facets] = await Promise.all([
    searchCatalog(params),
    getCatalogFacets(params.categorySlug),
  ]);

  const buildPageHref = (page: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") usp.set(k, v);
    }
    usp.set("pagina", String(page));
    return `/productos?${usp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>

      <div className="mt-6">
        <CatalogControls facets={facets} total={result.total} />
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-card border-border text-foreground-muted border border-dashed p-12 text-center text-sm">
          No encontramos productos con esos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav
          className="mt-10 flex items-center justify-center gap-2 text-sm"
          aria-label="Paginación"
        >
          {result.page > 1 && (
            <Link
              href={buildPageHref(result.page - 1)}
              className="border-border hover:bg-surface-muted rounded-md border px-3 py-1.5"
            >
              Anterior
            </Link>
          )}
          <span className="text-foreground-muted">
            Página {result.page} de {result.pages}
          </span>
          {result.page < result.pages && (
            <Link
              href={buildPageHref(result.page + 1)}
              className="border-border hover:bg-surface-muted rounded-md border px-3 py-1.5"
            >
              Siguiente
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
