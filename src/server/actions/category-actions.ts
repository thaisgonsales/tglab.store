"use server";

import { revalidatePath } from "next/cache";

import {
  categoryInputSchema,
  reorderSchema,
  type CategoryInput,
} from "@/lib/schemas/category";
import { slugify } from "@/lib/slug";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

function revalidateCategories() {
  revalidatePath("/admin/categorias");
  revalidatePath("/categorias");
  revalidatePath("/", "layout");
}

async function ensureUniqueSlug(
  base: string,
  ignoreId?: string,
): Promise<string> {
  const root = slugify(base) || "categoria";
  let slug = root;
  let i = 2;
  for (;;) {
    const existing = await db.category.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

export async function createCategory(input: CategoryInput) {
  return staffAction(async () => {
    const data = categoryInputSchema.parse(input);

    if (data.parentId) {
      const parent = await db.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) throw new ActionError("La categoría superior no existe.");
      if (parent.parentId) {
        throw new ActionError("Solo se permiten 2 niveles de categorías.");
      }
    }

    const slug = await ensureUniqueSlug(data.slug || data.name);
    const maxPos = await db.category.aggregate({
      where: { parentId: data.parentId ?? null },
      _max: { position: true },
    });

    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId ?? null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    revalidateCategories();
    return { id: category.id };
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  return staffAction(async () => {
    const data = categoryInputSchema.parse(input);
    const current = await db.category.findUnique({ where: { id } });
    if (!current) throw new ActionError("La categoría no existe.");

    if (data.parentId === id) {
      throw new ActionError("Una categoría no puede ser su propia superior.");
    }
    if (data.parentId) {
      const parent = await db.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) throw new ActionError("La categoría superior no existe.");
      if (parent.parentId) {
        throw new ActionError("Solo se permiten 2 niveles de categorías.");
      }
      const hasChildren = await db.category.count({ where: { parentId: id } });
      if (hasChildren > 0) {
        throw new ActionError(
          "Esta categoría tiene subcategorías; no puede pasar a ser subcategoría.",
        );
      }
    }

    const slug =
      data.slug && data.slug !== current.slug
        ? await ensureUniqueSlug(data.slug, id)
        : current.slug;

    await db.category.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId ?? null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
    });
    revalidateCategories();
    return { id };
  });
}

export async function deleteCategory(id: string) {
  return staffAction(async () => {
    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });
    if (!category) throw new ActionError("La categoría no existe.");
    if (category._count.children > 0) {
      throw new ActionError("Elimina o reasigna primero las subcategorías.");
    }
    if (category._count.products > 0) {
      throw new ActionError(
        `Hay ${category._count.products} producto(s) en esta categoría. Reasígnalos antes de eliminarla.`,
      );
    }
    await db.category.delete({ where: { id } });
    revalidateCategories();
    return null;
  });
}

export async function reorderCategories(ids: string[]) {
  return staffAction(async () => {
    const { ids: parsed } = reorderSchema.parse({ ids });
    await db.$transaction(
      parsed.map((id, index) =>
        db.category.update({ where: { id }, data: { position: index } }),
      ),
    );
    revalidateCategories();
    return null;
  });
}
