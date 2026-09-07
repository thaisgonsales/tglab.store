import type { CSSProperties } from "react";

import type { Settings } from "@/config/settings-schema";

/**
 * Convierte la configuración de marca en variables CSS para inyectar en <html>.
 * Así el color primario, etc. son editables desde /admin sin tocar el código.
 *
 * Emite variantes `-light` / `-dark`; globals.css elige la correcta según el
 * tema (una variable inline no puede depender de una media query).
 */
export function brandCssVars(brand: Settings["brand"]): CSSProperties {
  return {
    "--tglab-brand-light": brand.colorPrimary,
    "--tglab-brand-dark": brand.colorPrimaryDark || brand.colorPrimary,
    "--tglab-accent-light": brand.colorAccent,
    "--tglab-accent-dark": brand.colorAccent,
  } as CSSProperties;
}
