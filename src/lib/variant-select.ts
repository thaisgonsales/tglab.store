/**
 * Lógica (client-safe) para resolver la variante seleccionada a partir de las
 * opciones elegidas por el cliente en la ficha de producto.
 */

export type SelectableVariant = {
  id: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  /** attributeId -> attributeValueId */
  options: Record<string, string>;
};

export type SelectableAttribute = {
  id: string;
  name: string;
  type: "SELECT" | "COLOR";
  values: { id: string; label: string; hex: string | null }[];
};

/** Devuelve la variante cuyas opciones coinciden exactamente con la selección. */
export function resolveVariant(
  variants: SelectableVariant[],
  selection: Record<string, string>,
  attributes: SelectableAttribute[],
): SelectableVariant | null {
  if (attributes.length === 0) return variants[0] ?? null;
  if (attributes.some((a) => !selection[a.id])) return null;
  return (
    variants.find((v) =>
      attributes.every((a) => v.options[a.id] === selection[a.id]),
    ) ?? null
  );
}

/**
 * Para un atributo dado y la selección parcial actual, indica qué valores
 * llevan a al menos una variante con stock (para deshabilitar los imposibles).
 */
export function availableValueIds(
  attributeId: string,
  variants: SelectableVariant[],
  selection: Record<string, string>,
  attributes: SelectableAttribute[],
): Set<string> {
  const others = attributes.filter((a) => a.id !== attributeId);
  const result = new Set<string>();
  for (const v of variants) {
    const matchesOthers = others.every(
      (a) => !selection[a.id] || v.options[a.id] === selection[a.id],
    );
    if (matchesOthers && v.stock > 0) {
      const val = v.options[attributeId];
      if (val) result.add(val);
    }
  }
  return result;
}
