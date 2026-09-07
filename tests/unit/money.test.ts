import { describe, expect, it } from "vitest";

import {
  applyPercent,
  discountPercent,
  formatCLP,
  formatCLPNumber,
  sum,
} from "@/lib/money";

describe("money", () => {
  it("formatea CLP al estilo chileno (sin decimales, punto de miles)", () => {
    expect(formatCLP(5990)).toBe("$5.990");
    expect(formatCLP(12990)).toBe("$12.990");
    expect(formatCLP(1000000)).toBe("$1.000.000");
    expect(formatCLP(0)).toBe("$0");
  });

  it("formatea sin símbolo", () => {
    expect(formatCLPNumber(12990)).toBe("12.990");
  });

  it("calcula el porcentaje de descuento", () => {
    expect(discountPercent(10000, 8000)).toBe(20);
    expect(discountPercent(9990, 7990)).toBe(20);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 1200)).toBe(0);
    expect(discountPercent(0, 100)).toBe(0);
  });

  it("aplica un descuento porcentual redondeando a CLP", () => {
    expect(applyPercent(10000, 10)).toBe(9000);
    expect(applyPercent(5990, 15)).toBe(5092);
    expect(applyPercent(10000, 0)).toBe(10000);
    expect(applyPercent(10000, 150)).toBe(0);
  });

  it("suma líneas", () => {
    expect(sum([1990, 2990, 3990])).toBe(8970);
    expect(sum([])).toBe(0);
  });
});
