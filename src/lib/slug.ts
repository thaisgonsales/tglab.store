/**
 * Genera slugs amigables para URLs (categorias, productos, atributos).
 * Maneja acentos del espanol: NFD descompone a+tilde / n+tilde y luego
 * \p{Diacritic} elimina la marca combinante (a->a, n->n).
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Anade un sufijo numerico para desambiguar: "soporte-ps5" -> "soporte-ps5-2". */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}
