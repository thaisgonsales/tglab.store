import "server-only";

import sharp from "sharp";

export type ProcessedImage = {
  body: Buffer;
  contentType: string;
  ext: string;
  width: number;
  height: number;
  blurDataUrl: string;
};

const MAX_DIMENSION = 2400;

/**
 * Normaliza una imagen subida:
 *  - la re-encoda a WebP (calidad alta) y limita el lado mayor a 2400px
 *  - genera un placeholder difuminado (blurDataURL) para carga progresiva
 *  - devuelve dimensiones reales
 *
 * Re-encodar también elimina metadatos EXIF y payloads ocultos.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "error" }).rotate();

  const resized = pipeline.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  const { data, info } = await resized
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(input)
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    body: data,
    contentType: "image/webp",
    ext: "webp",
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
