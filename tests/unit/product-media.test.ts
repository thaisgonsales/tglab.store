import { describe, expect, it } from "vitest";

import { selectVariantImage, type VariantImage } from "@/lib/product-media";

const images: VariantImage[] = [
  {
    url: "/general.webp",
    isPrimary: true,
    variantId: null,
    attributeValueId: null,
  },
  {
    url: "/verde.webp",
    isPrimary: false,
    variantId: null,
    attributeValueId: "verde",
  },
  {
    url: "/verde-grande.webp",
    isPrimary: false,
    variantId: "verde-grande",
    attributeValueId: null,
  },
];

describe("selectVariantImage", () => {
  it("prefiere la imagen de la combinación exacta", () => {
    expect(selectVariantImage(images, "verde-grande", ["verde"])?.url).toBe(
      "/verde-grande.webp",
    );
  });

  it("usa la imagen del color para todas sus combinaciones", () => {
    expect(selectVariantImage(images, "verde-pequeno", ["verde"])?.url).toBe(
      "/verde.webp",
    );
  });

  it("vuelve a la imagen general cuando no hay una específica", () => {
    expect(selectVariantImage(images, "rosado", ["rosado"])?.url).toBe(
      "/general.webp",
    );
  });
});
