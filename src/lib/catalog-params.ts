import type {
  CatalogParams,
  CatalogSort,
} from "@/server/services/catalog-service";

const SORTS: CatalogSort[] = [
  "recomendados",
  "vendidos",
  "nuevos",
  "precio-asc",
  "precio-desc",
  "ofertas",
];

export const SORT_LABELS: Record<CatalogSort, string> = {
  recomendados: "Recomendados",
  vendidos: "Más vendidos",
  nuevos: "Más nuevos",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  ofertas: "Ofertas",
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Traduce los searchParams de la URL a `CatalogParams` tipados. */
export function parseCatalogParams(sp: RawParams): CatalogParams {
  const sortRaw = first(sp.orden);
  const sort = SORTS.includes(sortRaw as CatalogSort)
    ? (sortRaw as CatalogSort)
    : "recomendados";

  const priceMin = Number(first(sp.precio_min));
  const priceMax = Number(first(sp.precio_max));

  const color = first(sp.color);
  const modelo = first(sp.modelo);
  const atributos = [color, modelo, first(sp.atributo)]
    .filter((v): v is string => Boolean(v))
    .flatMap((v) => v.split(",").filter(Boolean));

  return {
    q: first(sp.q)?.trim() || undefined,
    categorySlug: first(sp.categoria) || undefined,
    priceMin: Number.isFinite(priceMin) && priceMin > 0 ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) && priceMax > 0 ? priceMax : undefined,
    inStock: first(sp.disponible) === "1",
    onlyOffers: sort === "ofertas" || first(sp.ofertas) === "1",
    attributeValueSlugs: atributos.length ? atributos : undefined,
    sort,
    page: Math.max(1, Number(first(sp.pagina)) || 1),
  };
}
