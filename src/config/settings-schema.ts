import { z } from "zod";
import { accountSettingsSchema } from "@/config/account-settings";

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
    .default(
      "Diseño, decoración y detalles únicos para hacer tu espacio especial.",
    ),
  announcementEnabled: z.boolean().default(true),
  announcementText: z
    .string()
    .default("Preparamos tu pedido en 2–4 días hábiles 💌"),
  logoUrl: z.string().default(""),
  logoDarkUrl: z.string().default(""),
  faviconUrl: z.string().default(""),
  ogImageUrl: z.string().default(""),
  colorPrimary: z.string().default("#bd527c"),
  colorPrimaryDark: z.string().default("#f2aac6"),
  colorAccent: z.string().default("#ef9d68"),
  colorBackground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#eee3d2"),
});

export const homeSettingsSchema = z.object({
  heroTitle: z.string().default("Transforma tu espacio"),
  heroSubtitle: z
    .string()
    .default(
      "Diseños especiales para darle personalidad a cada rincón de tu hogar.",
    ),
  heroPrimaryCtaLabel: z.string().default("Ver productos"),
  heroPrimaryCtaHref: z.string().default("/productos"),
  heroSecondaryCtaLabel: z.string().default("Crear algo personalizado"),
  heroSecondaryCtaHref: z.string().default("/personalizados"),
  heroTrustLine: z
    .string()
    .default("Diseños únicos, atención cercana y despacho a todo Chile."),
  benefits: z
    .array(z.object({ title: z.string().min(1), text: z.string().min(1) }))
    .length(4)
    .default([
      { title: "Diseños únicos", text: "Detalles con personalidad" },
      { title: "Compra segura", text: "Tus datos protegidos" },
      { title: "Despacho a todo Chile", text: "Seguimiento de tu pedido" },
      { title: "Atención personalizada", text: "Estamos para ayudarte" },
    ]),
  heroImageUrl: z.string().default(""),
  heroBackgroundVideoUrl: z.string().default("/media/store-background.mp4"),
  heroBackgroundPosterUrl: z.string().default("/media/store-background.jpg"),
  customCtaTitle: z.string().default("¿Tienes una idea especial?"),
  customCtaText: z
    .string()
    .default(
      "Cuéntanos lo que imaginas y conversemos sobre cómo hacerlo realidad.",
    ),
  customCtaLabel: z.string().default("Solicitar producto personalizado"),
  testimonials: z
    .array(
      z.object({
        name: z.string().min(1),
        quote: z.string().min(1),
        detail: z.string().default(""),
      }),
    )
    .default([]),
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
  email: z
    .string()
    .trim()
    .min(1)
    .catch("tglab.decor@gmail.com")
    .default("tglab.decor@gmail.com"),
  phone: z
    .string()
    .trim()
    .min(1)
    .catch("+56 9 9243 0939")
    .default("+56 9 9243 0939"),
  whatsapp: z.string().default("56992430939"), // formato E.164 sin +, ej: 56912345678
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
  account: accountSettingsSchema,
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
    account: defaultsFor("account"),
    brand: defaultsFor("brand"),
    home: defaultsFor("home"),
    contact: defaultsFor("contact"),
    commerce: defaultsFor("commerce"),
    legal: defaultsFor("legal"),
  };
}
