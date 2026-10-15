import { describe, expect, it } from "vitest";

import { isChiloeDestination } from "@/lib/shipping-regions";

describe("modelo simple de despacho", () => {
  it.each([
    "Ancud",
    "Castro",
    "Chonchi",
    "Curaco de Vélez",
    "Dalcahue",
    "Puqueldón",
    "Queilén",
    "Quemchi",
    "Quellón",
    "Quinchao",
  ])("aplica la tarifa fija a %s", (comuna) => {
    expect(isChiloeDestination("Región de Los Lagos", comuna)).toBe(true);
  });

  it("deja Puerto Montt y el resto de Chile como envío por pagar", () => {
    expect(isChiloeDestination("Región de Los Lagos", "Puerto Montt")).toBe(
      false,
    );
    expect(
      isChiloeDestination("Región Metropolitana de Santiago", "Santiago"),
    ).toBe(false);
  });
});
