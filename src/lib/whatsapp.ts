/** Utilidades para generar enlaces de WhatsApp (click-to-chat). */

/** Deja solo dígitos (formato E.164 sin "+"). */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Construye una URL wa.me con mensaje prellenado.
 * `template` admite el placeholder `{producto}` y `{url}`.
 */
export function buildWhatsappUrl(
  phone: string,
  message: string,
  vars: { producto?: string; url?: string } = {},
): string {
  const number = normalizePhone(phone);
  const text = message
    .replaceAll("{producto}", vars.producto ?? "")
    .replaceAll("{url}", vars.url ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
