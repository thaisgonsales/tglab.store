import "server-only";

import { cache } from "react";

import {
  allDefaults,
  defaultsFor,
  settingsSchemas,
  type Settings,
  type SettingsGroup,
} from "@/config/settings-schema";
import { db } from "@/server/db";

/**
 * Acceso central a la configuración de la tienda.
 * - Lee de la tabla `Setting` (una fila por grupo).
 * - Aplica el schema Zod: los campos ausentes toman el valor por defecto.
 * - `cache()` de React deduplica lecturas dentro de un mismo request.
 */

async function loadGroup<K extends SettingsGroup>(
  group: K,
): Promise<Settings[K]> {
  try {
    const row = await db.setting.findUnique({ where: { key: group } });
    const schema = settingsSchemas[group];
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data as Settings[K];
    // JSON guardado inconsistente: no romper la tienda.
    return defaultsFor(group);
  } catch {
    // BD no disponible (p. ej. durante `next build` sin conexión estable).
    return defaultsFor(group);
  }
}

export const getSettingsGroup = cache(
  async <K extends SettingsGroup>(group: K): Promise<Settings[K]> => {
    return loadGroup(group);
  },
);

export const getAllSettings = cache(async (): Promise<Settings> => {
  try {
    const [account, brand, home, contact, commerce, legal] = await Promise.all([
      loadGroup("account"),
      loadGroup("brand"),
      loadGroup("home"),
      loadGroup("contact"),
      loadGroup("commerce"),
      loadGroup("legal"),
    ]);
    return { account, brand, home, contact, commerce, legal };
  } catch {
    // BD no disponible (p. ej. durante `next build` sin conexión): usar defaults.
    return allDefaults();
  }
});

/** Escribe un grupo completo (merge con lo existente + validación). */
export async function updateSettingsGroup<K extends SettingsGroup>(
  group: K,
  value: Partial<Settings[K]>,
): Promise<Settings[K]> {
  const current = await loadGroup(group);
  const merged = settingsSchemas[group].parse({ ...current, ...value });
  await db.setting.upsert({
    where: { key: group },
    create: { key: group, value: merged },
    update: { value: merged },
  });
  return merged as Settings[K];
}
