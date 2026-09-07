/**
 * Clave determinista de una combinación de variante: los `attributeValueId`
 * ordenados y unidos por "|". Sirve como identidad estable de la combinación
 * (unique `(productId, optionsKey)` en la BD) para no duplicar combinaciones.
 *
 * El producto simple usa `optionsKey = ""`.
 */
export function buildOptionsKey(attributeValueIds: string[]): string {
  return [...attributeValueIds].sort().join("|");
}

/** Producto cartesiano de listas de valores por atributo. */
export function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) =>
      acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]],
  );
}
