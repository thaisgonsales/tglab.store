import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Zona horaria de la tienda. Chile observa horario de verano; usar siempre
 * la zona IANA (no un offset fijo) para que el cambio de hora sea correcto.
 */
export const STORE_TIMEZONE = "America/Santiago";

/** Convierte una fecha (UTC en BD) a la hora de Chile. */
export function toStoreZone(date: Date | string | number): TZDate {
  return new TZDate(new Date(date), STORE_TIMEZONE);
}

/** "07 sep 2026, 14:32" en hora de Chile. */
export function formatDateTime(date: Date | string | number): string {
  return format(toStoreZone(date), "dd MMM yyyy, HH:mm", { locale: es });
}

/** "07 de septiembre de 2026" en hora de Chile. */
export function formatDateLong(date: Date | string | number): string {
  return format(toStoreZone(date), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "07-09-2026" en hora de Chile. */
export function formatDateShort(date: Date | string | number): string {
  return format(toStoreZone(date), "dd-MM-yyyy", { locale: es });
}

/** Fecha/hora actual en la zona de la tienda. */
export function nowInStoreZone(): TZDate {
  return new TZDate(new Date(), STORE_TIMEZONE);
}
