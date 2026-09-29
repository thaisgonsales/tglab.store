import sharp from "sharp";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  throw new Error(
    "Uso: node scripts/prepare-brand-logo.mjs <entrada> <salida>",
  );
}

const source = sharp(input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });

for (let index = 0; index < data.length; index += 4) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const lightness = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
  const saturation =
    (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
  const ink = Math.max((0.94 - lightness) / 0.13, (saturation - 0.08) / 0.14);
  const normalized = Math.min(1, Math.max(0, (ink - 0.34) / 0.38));
  data[index + 3] = Math.round(
    normalized * normalized * (3 - 2 * normalized) * 255,
  );
}

const transparent = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

const monogram = await sharp(transparent)
  .extract({ left: 120, top: 215, width: 975, height: 700 })
  .resize({ height: 300 })
  .png()
  .toBuffer();

const lab = await sharp(transparent)
  .extract({ left: 430, top: 910, width: 390, height: 160 })
  .resize({ height: 150 })
  .png()
  .toBuffer();

const monogramMeta = await sharp(monogram).metadata();
const labMeta = await sharp(lab).metadata();
const gap = 28;
const width = monogramMeta.width + gap + labMeta.width;
const height = Math.max(monogramMeta.height, labMeta.height);

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: monogram, left: 0, top: 0 },
    {
      input: lab,
      left: monogramMeta.width + gap,
      top: Math.round((height - labMeta.height) / 2),
    },
  ])
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(output);
