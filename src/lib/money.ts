/**
 * Utilidades de dinero para TG LAB.
 *
 * Regla del sistema: todos los montos se guardan y se operan como enteros CLP
 * (sin decimales). El peso chileno no usa centavos en el comercio minorista.
 * El precio SIEMPRE se muestra con IVA incluido (Ley del Consumidor).
 */

export const DEFAULT_CURRENCY = "CLP" as const;

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const clpNumberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

/** Formatea un entero CLP como "$5.990". */
export function formatCLP(amount: number): string {
  return clpFormatter.format(Math.round(amount));
}

/** Formatea sin el símbolo: "5.990". */
export function formatCLPNumber(amount: number): string {
  return clpNumberFormatter.format(Math.round(amount));
}

/** Redondea a entero CLP (evita fracciones tras aplicar % de descuento). */
export function toCLP(amount: number): number {
  return Math.round(amount);
}

/**
 * Calcula el porcentaje de descuento entre un precio de referencia y el precio
 * final. Devuelve 0 si no hay descuento válido.
 */
export function discountPercent(compareAt: number, price: number): number {
  if (compareAt <= 0 || price <= 0 || price >= compareAt) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Aplica un descuento porcentual (0-100) y redondea a CLP. */
export function applyPercent(amount: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100);
  return toCLP(amount * (1 - pct / 100));
}

/** Suma segura de líneas de dinero. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
