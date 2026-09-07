import "server-only";

import { nanoid } from "nanoid";

import { getStorage } from "@/server/storage";
import { processImage } from "@/server/upload/process-image";
import {
  UploadValidationError,
  validateUpload,
  type UploadKind,
} from "@/server/upload/validate";

export type UploadResult = {
  kind: UploadKind;
  url: string;
  storageKey: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

export { UploadValidationError };

/**
 * Valida, procesa y almacena un archivo subido desde el panel.
 * `folder` agrupa los objetos (p. ej. "productos", "banners", "solicitudes").
 */
export async function handleUpload(
  file: File,
  opts: { folder: string; allow?: UploadKind[] },
): Promise<UploadResult> {
  const raw = Buffer.from(await file.arrayBuffer());
  if (raw.byteLength === 0) {
    throw new UploadValidationError("El archivo está vacío.");
  }

  const validated = validateUpload(raw, { allow: opts.allow });
  const storage = getStorage();
  const id = nanoid(21);
  const folder = opts.folder.replace(/[^a-z0-9/_-]/gi, "");

  if (validated.kind === "image") {
    const img = await processImage(raw);
    const key = `${folder}/${id}.${img.ext}`;
    const stored = await storage.put({
      body: img.body,
      key,
      contentType: img.contentType,
    });
    return {
      kind: "image",
      url: stored.url,
      storageKey: stored.key,
      mime: img.contentType,
      sizeBytes: img.body.byteLength,
      width: img.width,
      height: img.height,
      blurDataUrl: img.blurDataUrl,
    };
  }

  // video / pdf: se almacenan tal cual (ya validados por firma y tamaño)
  const key = `${folder}/${id}.${validated.ext}`;
  const stored = await storage.put({
    body: raw,
    key,
    contentType: validated.mime,
  });
  return {
    kind: validated.kind,
    url: stored.url,
    storageKey: stored.key,
    mime: validated.mime,
    sizeBytes: raw.byteLength,
    width: null,
    height: null,
    blurDataUrl: null,
  };
}

/** Elimina un objeto del almacenamiento (ignora si no existe). */
export async function deleteStored(storageKey: string | null): Promise<void> {
  if (!storageKey) return;
  try {
    await getStorage().delete(storageKey);
  } catch (err) {
    console.error("[upload] no se pudo eliminar", storageKey, err);
  }
}
