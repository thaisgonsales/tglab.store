"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { deleteStored } from "@/server/upload/upload-service";

const addMediaSchema = z.object({
  productId: z.string().cuid(),
  type: z.enum(["IMAGE", "VIDEO"]),
  provider: z.string().max(20).default("local"),
  url: z.string().min(1).max(1000),
  storageKey: z.string().max(500).nullable().optional(),
  posterUrl: z.string().max(1000).nullable().optional(),
  alt: z.string().max(200).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  blurDataUrl: z.string().max(4000).nullable().optional(),
});

export type AddMediaInput = z.infer<typeof addMediaSchema>;

function revalidate(productId: string) {
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/productos");
  revalidatePath("/", "layout");
}

export async function addProductMedia(input: AddMediaInput) {
  return staffAction(async () => {
    const data = addMediaSchema.parse(input);
    const product = await db.product.findUnique({
      where: { id: data.productId },
      select: { id: true, _count: { select: { media: true } } },
    });
    if (!product) throw new ActionError("El producto no existe.");

    const media = await db.productMedia.create({
      data: {
        productId: data.productId,
        type: data.type,
        provider: data.provider,
        url: data.url,
        storageKey: data.storageKey ?? null,
        posterUrl: data.posterUrl ?? null,
        alt: data.alt ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        blurDataUrl: data.blurDataUrl ?? null,
        position: product._count.media,
        isPrimary: product._count.media === 0 && data.type === "IMAGE",
      },
    });
    revalidate(data.productId);
    return { id: media.id };
  });
}

export async function deleteProductMedia(mediaId: string) {
  return staffAction(async () => {
    const media = await db.productMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new ActionError("El elemento no existe.");

    await db.$transaction(async (tx) => {
      await tx.productMedia.delete({ where: { id: mediaId } });
      if (media.isPrimary) {
        const next = await tx.productMedia.findFirst({
          where: { productId: media.productId, type: "IMAGE" },
          orderBy: { position: "asc" },
        });
        if (next) {
          await tx.productMedia.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    await deleteStored(media.storageKey);
    revalidate(media.productId);
    return null;
  });
}

export async function reorderProductMedia(
  productId: string,
  mediaIds: string[],
) {
  return staffAction(async () => {
    const ids = z.array(z.string().cuid()).min(1).parse(mediaIds);
    const owned = await db.productMedia.findMany({
      where: { productId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      throw new ActionError("Lista de medios inválida.");
    }
    await db.$transaction(
      ids.map((id, index) =>
        db.productMedia.update({ where: { id }, data: { position: index } }),
      ),
    );
    revalidate(productId);
    return null;
  });
}

export async function setPrimaryMedia(mediaId: string) {
  return staffAction(async () => {
    const media = await db.productMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new ActionError("El elemento no existe.");
    if (media.type !== "IMAGE") {
      throw new ActionError("Solo una imagen puede ser la principal.");
    }
    await db.$transaction([
      db.productMedia.updateMany({
        where: { productId: media.productId, isPrimary: true },
        data: { isPrimary: false },
      }),
      db.productMedia.update({
        where: { id: mediaId },
        data: { isPrimary: true },
      }),
    ]);
    revalidate(media.productId);
    return null;
  });
}

export async function updateMediaAlt(mediaId: string, alt: string) {
  return staffAction(async () => {
    const media = await db.productMedia.findUnique({
      where: { id: mediaId },
      select: { productId: true },
    });
    if (!media) throw new ActionError("El elemento no existe.");
    await db.productMedia.update({
      where: { id: mediaId },
      data: { alt: alt.trim().slice(0, 200) || null },
    });
    revalidate(media.productId);
    return null;
  });
}

const externalVideoSchema = z.object({
  productId: z.string().cuid(),
  url: z
    .string()
    .url("URL inválida")
    .refine(
      (u) => /youtube\.com|youtu\.be|vimeo\.com/.test(u),
      "Solo se admiten URLs de YouTube o Vimeo",
    ),
});

export async function addExternalVideo(
  input: z.infer<typeof externalVideoSchema>,
) {
  return staffAction(async () => {
    const data = externalVideoSchema.parse(input);
    const product = await db.product.findUnique({
      where: { id: data.productId },
      select: { _count: { select: { media: true } } },
    });
    if (!product) throw new ActionError("El producto no existe.");
    const media = await db.productMedia.create({
      data: {
        productId: data.productId,
        type: "VIDEO",
        provider: "external",
        url: data.url,
        position: product._count.media,
      },
    });
    revalidate(data.productId);
    return { id: media.id };
  });
}
