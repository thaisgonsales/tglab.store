import { NextResponse, type NextRequest } from "next/server";
import { nanoid } from "nanoid";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import { putPrivateObject } from "@/server/storage/private-storage";
import { processImage } from "@/server/upload/process-image";
import { createPrivateUploadToken } from "@/server/upload/private-upload-token";
import {
  UploadValidationError,
  validateUpload,
} from "@/server/upload/validate";

export const runtime = "nodejs";

/**
 * Subida pública de imágenes de referencia para solicitudes de productos
 * personalizados. Solo imágenes, con límite de tamaño y rate limiting por IP.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req);
  const limit = await rateLimit(`custom-upload:${ip}`, {
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Intenta más tarde." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    validateUpload(raw, { allow: ["image"] });
    const image = await processImage(raw);
    const storageKey = `solicitudes/${nanoid(21)}.${image.ext}`;
    await putPrivateObject({
      key: storageKey,
      body: image.body,
      contentType: image.contentType,
    });
    return NextResponse.json({
      uploadToken: createPrivateUploadToken({
        key: storageKey,
        mime: "image/webp",
        size: image.body.byteLength,
      }),
      mimeType: image.contentType,
      sizeBytes: image.body.byteLength,
    });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[api/uploads/custom-request]", err);
    return NextResponse.json(
      { error: "No se pudo subir la imagen." },
      { status: 500 },
    );
  }
}
