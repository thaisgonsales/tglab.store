"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { INFO_PAGE_SLUGS } from "@/config/info-pages";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

const pageSchema = z.object({
  slug: z.enum(INFO_PAGE_SLUGS),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().max(20000),
  isPublished: z.boolean().default(true),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
});

export async function saveInfoPage(input: z.input<typeof pageSchema>) {
  return staffAction(async () => {
    const data = pageSchema.parse(input);
    // El cuerpo se guarda como párrafos (separados por línea en blanco).
    const paragraphs = data.body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      throw new ActionError("El contenido no puede quedar vacío.");
    }

    await db.page.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        title: data.title,
        content: paragraphs,
        isPublished: data.isPublished,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
      update: {
        title: data.title,
        content: paragraphs,
        isPublished: data.isPublished,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
    });

    revalidatePath(`/${data.slug}`);
    revalidatePath("/admin/paginas");
    return null;
  });
}
