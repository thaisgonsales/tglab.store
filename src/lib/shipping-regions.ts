const CHILOE_COMUNAS = new Set([
  "Ancud",
  "Castro",
  "Chonchi",
  "Curaco de Vélez",
  "Dalcahue",
  "Puqueldón",
  "Queilén",
  "Quemchi",
  "Quellón",
  "Quinchao",
]);

export function isChiloeDestination(region: string, comuna: string): boolean {
  return region === "Región de Los Lagos" && CHILOE_COMUNAS.has(comuna);
}
