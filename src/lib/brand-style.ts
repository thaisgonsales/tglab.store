import type { CSSProperties } from "react";

import type { Settings } from "@/config/settings-schema";

/**
 * Convierte la configuración de marca en variables CSS para inyectar en <html>.
 * Así el color primario, etc. son editables desde /admin sin tocar el código.
 */
export function brandCssVars(brand: Settings["brand"]): CSSProperties {
  return {
    "--tglab-brand": brand.colorPrimary,
    "--tglab-accent": brand.colorAccent,
  } as CSSProperties;
}
