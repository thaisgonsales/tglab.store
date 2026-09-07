"use server";

import { revalidatePath } from "next/cache";

import { settingsSchemas, type SettingsGroup } from "@/config/settings-schema";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { updateSettingsGroup } from "@/server/services/settings-service";

/** Guarda un grupo de configuración de la tienda desde /admin/configuracion. */
export async function saveSettings(group: SettingsGroup, value: unknown) {
  return staffAction(async () => {
    if (!(group in settingsSchemas)) {
      throw new ActionError("Grupo de configuración inválido.");
    }
    const parsed = settingsSchemas[group].safeParse(value);
    if (!parsed.success) {
      throw new ActionError("Revisa los datos del formulario.");
    }
    await updateSettingsGroup(group, parsed.data);

    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracion");
    return null;
  });
}
