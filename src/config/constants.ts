/**
 * Constantes del dominio que NO cambian desde el panel admin.
 * Lo configurable vive en `Setting` (ver settings-schema.ts).
 */

export const ORDER_NUMBER_PREFIX = "TG-";
export const ORDER_NUMBER_PAD = 6; // TG-000001

/** Vida del carrito de invitado (cookie + fila en BD). */
export const CART_TTL_DAYS = 30;
export const CART_COOKIE_NAME = "tglab_cart";

/** Reserva de stock al iniciar el pago. */
export const STOCK_RESERVATION_TTL_MINUTES = 15;

/** Defaults de disponibilidad (sobre-escribibles por producto y por Setting). */
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const DEFAULT_LAST_UNITS_THRESHOLD = 5;

export const ADMIN_ROLES = ["owner", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Rutas del panel que exigen sesión de staff. */
export const ADMIN_PATH_PREFIX = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";

/** Tipos MIME permitidos en subidas (validados también por magic bytes). */
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"] as const;

export const ALLOWED_UPLOAD_MIME = [
  ...ALLOWED_IMAGE_MIME,
  ...ALLOWED_VIDEO_MIME,
  "application/pdf",
] as const;
