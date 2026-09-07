import { describe, expect, it } from "vitest";

import { buildOptionsKey, cartesian } from "@/lib/variant-key";

describe("buildOptionsKey", () => {
  it("es estable sin importar el orden de entrada", () => {
    expect(buildOptionsKey(["b", "a", "c"])).toBe("a|b|c");
    expect(buildOptionsKey(["c", "b", "a"])).toBe("a|b|c");
  });
  it("producto simple = cadena vacia", () => {
    expect(buildOptionsKey([])).toBe("");
  });
});

describe("cartesian", () => {
  it("combina dos grupos", () => {
    const result = cartesian([
      ["PS5", "Xbox"],
      ["Negro", "Blanco", "Rojo"],
    ]);
    expect(result).toHaveLength(6);
    expect(result).toContainEqual(["PS5", "Negro"]);
    expect(result).toContainEqual(["Xbox", "Rojo"]);
  });

  it("un solo grupo", () => {
    expect(cartesian([["A", "B"]])).toEqual([["A"], ["B"]]);
  });

  it("sin grupos", () => {
    expect(cartesian([])).toEqual([[]]);
  });

  it("tres atributos", () => {
    const result = cartesian([
      ["a", "b"],
      ["x", "y"],
      ["1", "2"],
    ]);
    expect(result).toHaveLength(8);
  });
});
