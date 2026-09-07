/**
 * Validación y formato de RUT chileno (Rol Único Tributario).
 * Se almacena normalizado sin puntos y con guión: "12345678-5".
 */

/** Quita puntos, guiones y espacios; mayúscula la K. */
export function cleanRut(value: string): string {
  return value.replace(/[.\-\s]/g, "").toUpperCase();
}

/** Calcula el dígito verificador para el cuerpo numérico dado. */
export function computeDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** `true` si el RUT (con o sin formato) es válido. */
export function isValidRut(value: string): boolean {
  const clean = cleanRut(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return computeDv(body) === dv;
}

/** Normaliza a "12345678-5". Lanza si es inválido. */
export function normalizeRut(value: string): string {
  const clean = cleanRut(value);
  if (!isValidRut(clean)) {
    throw new Error(`RUT inválido: ${value}`);
  }
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/** Formatea para mostrar: "12.345.678-5". */
export function formatRut(value: string): string {
  const clean = cleanRut(value);
  if (clean.length < 2) return value;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}
