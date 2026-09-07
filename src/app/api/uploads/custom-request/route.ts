import { NextResponse, type NextRequest } from "next/server";

import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  handleUpload,
  UploadValidationError,
} from "@/server/upload/upload-service";

export const runtime = "nodejs";

/**
 * Subida pública de imágenes de referencia para solicitudes de productos
 * personalizados. Solo imágenes, con límite de tamaño y rate limiting por IP.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req);
  const limit = rateLimit(`custom-upload:${ip}`, {
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
    const result = await handleUpload(file, {
      folder: "solicitudes",
      allow: ["image"],
    });
    return NextResponse.json({
      url: result.url,
      storageKey: result.storageKey,
      mime: result.mime,
      sizeBytes: result.sizeBytes,
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
