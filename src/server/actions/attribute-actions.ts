"use server";

import { revalidatePath } from "next/cache";

import {
  attributeInputSchema,
  type AttributeInput,
} from "@/lib/schemas/attribute";
import { slugify } from "@/lib/slug";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

function revalidate() {
  revalidatePath("/admin/atributos");
  revalidatePath("/admin/productos");
}

async function uniqueAttributeSlug(name: string, ignoreId?: string) {
  const root = slugify(name) || "atributo";
  let slug = root;
  let i = 2;
  for (;;) {
    const existing = await db.attribute.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

/** Slug único por valor dentro del atributo. */
function valueSlugs(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const root = slugify(label) || "valor";
    const count = seen.get(root) ?? 0;
    seen.set(root, count + 1);
    return count === 0 ? root : `${root}-${count + 1}`;
  });
}

export async function createAttribute(input: AttributeInput) {
  return staffAction(async () => {
    const data = attributeInputSchema.parse(input);
    const slug = await uniqueAttributeSlug(data.name);
    const maxPos = await db.attribute.aggregate({ _max: { position: true } });
    const slugs = valueSlugs(data.values.map((v) => v.label));

    const attribute = await db.attribute.create({
      data: {
        name: data.name,
        slug,
        type: data.type,
        position: (maxPos._max.position ?? -1) + 1,
        values: {
          create: data.values.map((v, i) => ({
            label: v.label,
            slug: slugs[i]!,
            hex: data.type === "COLOR" ? v.hex || null : null,
            imageUrl: v.imageUrl || null,
            position: i,
          })),
        },
      },
    });
    revalidate();
    return { id: attribute.id };
  });
}

export async function updateAttribute(id: string, input: AttributeInput) {
  return staffAction(async () => {
    const data = attributeInputSchema.parse(input);
    const current = await db.attribute.findUnique({
      where: { id },
      include: { values: true },
    });
    if (!current) throw new ActionError("El atributo no existe.");

    const keptIds = new Set(
      data.values.map((v) => v.id).filter((v): v is string => Boolean(v)),
    );
    const toDelete = current.values.filter((v) => !keptIds.has(v.id));

    // No borrar valores que ya estén usados por variantes.
    if (toDelete.length > 0) {
      const usage = await db.variantAttributeValue.count({
        where: { attributeValueId: { in: toDelete.map((v) => v.id) } },
      });
      if (usage > 0) {
        throw new ActionError(
          "No se pueden eliminar valores que ya están en uso por variantes de productos.",
        );
      }
    }

    const slugs = valueSlugs(data.values.map((v) => v.label));

    await db.$transaction(async (tx) => {
      await tx.attribute.update({
        where: { id },
        data: { name: data.name, type: data.type },
      });
      if (toDelete.length > 0) {
        await tx.attributeValue.deleteMany({
          where: { id: { in: toDelete.map((v) => v.id) } },
        });
      }
      for (let i = 0; i < data.values.length; i++) {
        const v = data.values[i]!;
        const payload = {
          label: v.label,
          slug: slugs[i]!,
          hex: data.type === "COLOR" ? v.hex || null : null,
          imageUrl: v.imageUrl || null,
          position: i,
        };
        if (v.id) {
          await tx.attributeValue.update({
            where: { id: v.id },
            data: payload,
          });
        } else {
          await tx.attributeValue.create({
            data: { ...payload, attributeId: id },
          });
        }
      }
    });
    revalidate();
    return { id };
  });
}

export async function deleteAttribute(id: string) {
  return staffAction(async () => {
    const usage = await db.productAttribute.count({
      where: { attributeId: id },
    });
    if (usage > 0) {
      throw new ActionError(
        `Este atributo está asignado a ${usage} producto(s). Quítalo de esos productos antes de eliminarlo.`,
      );
    }
    await db.attribute.delete({ where: { id } });
    revalidate();
    return null;
  });
}
