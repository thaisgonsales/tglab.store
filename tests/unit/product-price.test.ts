import { describe, expect, it } from "vitest";

import { summarizePrice } from "@/lib/product-price";

describe("summarizePrice", () => {
  it("producto simple sin stock", () => {
    const s = summarizePrice([{ price: 5990, compareAtPrice: null, stock: 0 }]);
    expect(s.from).toBe(5990);
    expect(s.inStock).toBe(false);
    expect(s.hasRange).toBe(false);
  });

  it("toma el precio minimo y detecta rango", () => {
    const s = summarizePrice([
      { price: 8990, compareAtPrice: null, stock: 4 },
      { price: 6990, compareAtPrice: null, stock: 2 },
    ]);
    expect(s.from).toBe(6990);
    expect(s.hasRange).toBe(true);
    expect(s.totalStock).toBe(6);
  });

  it("calcula descuento sobre la variante mas barata", () => {
    const s = summarizePrice([{ price: 7990, compareAtPrice: 9990, stock: 3 }]);
    expect(s.compareAt).toBe(9990);
    expect(s.discountPercent).toBe(20);
  });

  it("sin variantes", () => {
    const s = summarizePrice([]);
    expect(s).toMatchObject({ from: 0, inStock: false, totalStock: 0 });
  });
});
