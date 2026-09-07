import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

/**
 * Sirve los archivos subidos cuando `STORAGE_DRIVER=local` (desarrollo).
 * En producción se usa S3/R2 y esta ruta no se utiliza.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await ctx.params;
  const rel = segments.join("/");
  const full = path.normalize(path.join(UPLOAD_ROOT, rel));

  if (!full.startsWith(UPLOAD_ROOT)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(full);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const ext = path.extname(full).toLowerCase();
    const stream = Readable.toWeb(
      createReadStream(full),
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
