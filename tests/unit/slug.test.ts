import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("normaliza acentos y enie del espanol", () => {
    expect(slugify("Decoración")).toBe("decoracion");
    expect(slugify("Diseño Único")).toBe("diseno-unico");
    expect(slugify("Lámpara Gamer")).toBe("lampara-gamer");
  });

  it("limpia simbolos y espacios", () => {
    expect(slugify("Soporte / Control  PS5!")).toBe("soporte-control-ps5");
    expect(slugify("  --Hola--  ")).toBe("hola");
  });

  it("uniqueSlug agrega sufijo cuando colisiona", () => {
    const taken = new Set(["soporte-ps5", "soporte-ps5-2"]);
    expect(uniqueSlug("Soporte PS5", taken)).toBe("soporte-ps5-3");
    expect(uniqueSlug("Nuevo", taken)).toBe("nuevo");
  });
});
