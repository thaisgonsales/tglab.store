import { z } from "zod";

import {
  DEFAULT_LAST_UNITS_THRESHOLD,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "@/config/constants";

/**
 * Configuración editable de la tienda desde /admin/configuracion.
 * Se guarda como filas en la tabla `Setting` (una fila por grupo, `value` JSON).
 * NADA de identidad visual ni textos está hardcodeado en el código.
 */

export const brandSettingsSchema = z.object({
  storeName: z.string().min(1).default("TG LAB"),
  tagline: z
    .string()
    .default("Accesorios, decoración y productos únicos fabricados en Chiloé."),
  logoUrl: z.string().default(""),
  logoDarkUrl: z.string().default(""),
  faviconUrl: z.string().default(""),
  ogImageUrl: z.string().default(""),
  colorPrimary: z.string().default("#0e7c86"),
  colorPrimaryDark: z.string().default("#45d6c5"),
  colorAccent: z.string().default("#e0a955"),
});

export const homeSettingsSchema = z.object({
  heroTitle: z.string().default("Transforma tu espacio con TG LAB"),
  heroSubtitle: z
    .string()
    .default(
      "Accesorios, decoración y productos únicos fabricados en Chiloé mediante impresión 3D.",
    ),
  heroPrimaryCtaLabel: z.string().default("Ver productos"),
  heroPrimaryCtaHref: z.string().default("/productos"),
  heroSecondaryCtaLabel: z.string().default("Explorar novedades"),
  heroSecondaryCtaHref: z.string().default("/productos?orden=nuevos"),
  heroImageUrl: z.string().default(""),
  customCtaTitle: z.string().default("¿Tienes una idea?"),
  customCtaText: z
    .string()
    .default(
      "En TG LAB fabricamos productos personalizados a tu medida. Cuéntanos qué necesitas.",
    ),
  customCtaLabel: z.string().default("Solicitar personalizado"),
  sections: z
    .array(
      z.object({
        key: z.string(),
        title: z.string(),
        type: z.enum(["featured", "bestsellers", "new", "offers", "category"]),
        categorySlug: z.string().optional(),
        enabled: z.boolean().default(true),
      }),
    )
    .default([
      {
        key: "featured",
        title: "Productos destacados",
        type: "featured",
        enabled: true,
      },
      { key: "new", title: "Nuevos productos", type: "new", enabled: true },
      {
        key: "bestsellers",
        title: "Más vendidos",
        type: "bestsellers",
        enabled: true,
      },
      { key: "offers", title: "Ofertas", type: "offers", enabled: true },
    ]),
});

export const contactSettingsSchema = z.object({
  email: z.string().default(""),
  phone: z.string().default(""),
  whatsapp: z.string().default(""), // formato E.164 sin +, ej: 56912345678
  whatsappMessage: z
    .string()
    .default("Hola, vi {producto} en TG LAB y quisiera consultar..."),
  instagram: z.string().default(""),
  facebook: z.string().default(""),
  addressPublic: z.string().default(""), // punto de retiro visible; vacío = oculto
  city: z.string().default("Chiloé, Región de Los Lagos"),
});

const bankTransferDetailsSchema = z.object({
  accountHolder: z.string().default(""),
  rut: z.string().default(""),
  bank: z.string().default(""),
  accountType: z.string().default(""),
  accountNumber: z.string().default(""),
  email: z.string().default(""),
});

export const commerceSettingsSchema = z.object({
  lowStockThreshold: z
    .number()
    .int()
    .min(0)
    .default(DEFAULT_LOW_STOCK_THRESHOLD),
  lastUnitsThreshold: z
    .number()
    .int()
    .min(0)
    .default(DEFAULT_LAST_UNITS_THRESHOLD),
  freeShippingOverSubtotal: z.number().int().min(0).nullable().default(null),
  pickupEnabled: z.boolean().default(true),
  pickupInstructions: z
    .string()
    .default(
      "Coordinaremos el punto de retiro en Chiloé una vez confirmado tu pedido.",
    ),
  bankTransferInstructions: z.string().default(""),
  bankTransferDetails: bankTransferDetailsSchema.default(() =>
    bankTransferDetailsSchema.parse({}),
  ),
});

export const legalSettingsSchema = z.object({
  legalName: z.string().default("[PENDIENTE: nombre / razón social]"),
  legalRut: z.string().default("[PENDIENTE: RUT]"),
  legalRegime: z.string().default("Persona natural con Inicio de Actividades"),
});

export const settingsSchemas = {
  brand: brandSettingsSchema,
  home: homeSettingsSchema,
  contact: contactSettingsSchema,
  commerce: commerceSettingsSchema,
  legal: legalSettingsSchema,
} as const;

export type SettingsGroup = keyof typeof settingsSchemas;

export type Settings = {
  [K in SettingsGroup]: z.infer<(typeof settingsSchemas)[K]>;
};

/** Devuelve los valores por defecto de un grupo (aplicando el schema Zod). */
export function defaultsFor<K extends SettingsGroup>(group: K): Settings[K] {
  return settingsSchemas[group].parse({}) as Settings[K];
}

export function allDefaults(): Settings {
  return {
    brand: defaultsFor("brand"),
    home: defaultsFor("home"),
    contact: defaultsFor("contact"),
    commerce: defaultsFor("commerce"),
    legal: defaultsFor("legal"),
  };
}
