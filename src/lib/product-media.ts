export type VariantImage = {
  url: string;
  isPrimary: boolean;
  variantId: string | null;
  attributeValueId: string | null;
};

/** Elige la foto más específica: combinación, color/valor y luego general. */
export function selectVariantImage(
  media: VariantImage[],
  variantId: string,
  attributeValueIds: string[],
): VariantImage | null {
  return (
    media.find((item) => item.variantId === variantId) ??
    media.find(
      (item) =>
        item.attributeValueId !== null &&
        attributeValueIds.includes(item.attributeValueId),
    ) ??
    media.find(
      (item) => item.isPrimary && !item.variantId && !item.attributeValueId,
    ) ??
    media.find((item) => !item.variantId && !item.attributeValueId) ??
    media[0] ??
    null
  );
}
