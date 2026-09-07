"use server";

import { revalidatePath } from "next/cache";

import { saveCustomFieldsSchema } from "@/lib/schemas/variant";
import { slugify } from "@/lib/slug";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

/** Reemplaza el conjunto de campos personalizados de un producto. */
export async function saveCustomFields(input: {
  productId: string;
  fields: {
    id?: string;
    label: string;
    helpText?: string;
    type:
      "TEXT_SHORT" | "TEXT_LONG" | "NUMBER" | "SELECT" | "CHECKBOX" | "FILE";
    isRequired: boolean;
    maxLength?: number;
    options: string[];
  }[];
}) {
  return staffAction(async () => {
    const { productId, fields } = saveCustomFieldsSchema.parse(input);
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw new ActionError("El producto no existe.");

    for (const f of fields) {
      if (f.type === "SELECT" && f.options.length === 0) {
        throw new ActionError(
          `El campo "${f.label}" es de tipo selector y necesita opciones.`,
        );
      }
    }

    // key única y estable por label
    const usedKeys = new Set<string>();
    const withKeys = fields.map((f, i) => {
      let key = slugify(f.label).replace(/-/g, "_") || `campo_${i + 1}`;
      while (usedKeys.has(key)) key = `${key}_${i + 1}`;
      usedKeys.add(key);
      return { ...f, key };
    });

    await db.$transaction(async (tx) => {
      const keepIds = withKeys
        .map((f) => f.id)
        .filter((v): v is string => Boolean(v));
      await tx.customFieldDefinition.deleteMany({
        where: { productId, id: { notIn: keepIds } },
      });
      for (let i = 0; i < withKeys.length; i++) {
        const f = withKeys[i]!;
        const payload = {
          key: f.key,
          label: f.label,
          helpText: f.helpText || null,
          type: f.type,
          isRequired: f.isRequired,
          maxLength: f.maxLength ?? null,
          options: f.type === "SELECT" ? f.options : [],
          position: i,
        };
        if (f.id) {
          await tx.customFieldDefinition.update({
            where: { id: f.id },
            data: payload,
          });
        } else {
          await tx.customFieldDefinition.create({
            data: { ...payload, productId },
          });
        }
      }
    });

    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath("/productos");
    return null;
  });
}
