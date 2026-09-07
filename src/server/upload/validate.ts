import "server-only";

import { getEnv } from "@/lib/env";

export type UploadKind = "image" | "video" | "pdf";

export type ValidatedUpload = {
  kind: UploadKind;
  mime: string;
  ext: string;
};

type Signature = {
  kind: UploadKind;
  mime: string;
  ext: string;
  /** offset -> bytes esperados */
  match: (bytes: Uint8Array) => boolean;
};

const startsWith = (b: Uint8Array, sig: number[], offset = 0): boolean =>
  sig.every((v, i) => b[offset + i] === v);

const asciiAt = (b: Uint8Array, offset: number, text: string): boolean =>
  [...text].every((c, i) => b[offset + i] === c.charCodeAt(0));

const SIGNATURES: Signature[] = [
  {
    kind: "image",
    mime: "image/jpeg",
    ext: "jpg",
    match: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    kind: "image",
    mime: "image/png",
    ext: "png",
    match: (b) =>
      startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    kind: "image",
    mime: "image/webp",
    ext: "webp",
    match: (b) => asciiAt(b, 0, "RIFF") && asciiAt(b, 8, "WEBP"),
  },
  {
    kind: "image",
    mime: "image/avif",
    ext: "avif",
    match: (b) => asciiAt(b, 4, "ftyp") && asciiAt(b, 8, "avif"),
  },
  {
    kind: "video",
    mime: "video/mp4",
    ext: "mp4",
    match: (b) =>
      asciiAt(b, 4, "ftyp") &&
      (asciiAt(b, 8, "isom") ||
        asciiAt(b, 8, "mp4") ||
        asciiAt(b, 8, "iso") ||
        asciiAt(b, 8, "M4V") ||
        asciiAt(b, 8, "avc1") ||
        asciiAt(b, 8, "dash")),
  },
  {
    kind: "video",
    mime: "video/webm",
    ext: "webm",
    match: (b) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]),
  },
  {
    kind: "pdf",
    mime: "application/pdf",
    ext: "pdf",
    match: (b) => asciiAt(b, 0, "%PDF-"),
  },
];

export class UploadValidationError extends Error {}

/**
 * Valida un archivo subido comprobando su firma binaria real (magic bytes),
 * no la extensión ni el `Content-Type` declarado por el cliente, y el tamaño.
 */
export function validateUpload(
  buffer: Buffer,
  opts: { allow?: UploadKind[] } = {},
): ValidatedUpload {
  const env = getEnv();
  const bytes = new Uint8Array(buffer.subarray(0, 32));

  const sig = SIGNATURES.find((s) => s.match(bytes));
  if (!sig) {
    throw new UploadValidationError(
      "Formato de archivo no permitido. Usa JPG, PNG, WebP, AVIF, MP4, WebM o PDF.",
    );
  }

  const allow = opts.allow ?? ["image", "video", "pdf"];
  if (!allow.includes(sig.kind)) {
    throw new UploadValidationError(
      `Este campo solo acepta: ${allow.join(", ")}.`,
    );
  }

  const maxBytes =
    sig.kind === "video"
      ? env.UPLOAD_MAX_VIDEO_BYTES
      : env.UPLOAD_MAX_IMAGE_BYTES;

  if (buffer.byteLength > maxBytes) {
    const mb = (maxBytes / 1_048_576).toFixed(0);
    throw new UploadValidationError(
      `El archivo supera el tamaño máximo (${mb} MB).`,
    );
  }

  return { kind: sig.kind, mime: sig.mime, ext: sig.ext };
}
