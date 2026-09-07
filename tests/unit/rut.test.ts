import { describe, expect, it } from "vitest";

import { computeDv, formatRut, isValidRut, normalizeRut } from "@/lib/rut";

describe("rut", () => {
  it("calcula digitos verificadores conocidos", () => {
    expect(computeDv("11111111")).toBe("1");
    expect(computeDv("12345678")).toBe("5");
  });

  it("valida RUTs con y sin formato", () => {
    expect(isValidRut("12.345.678-5")).toBe(true);
    expect(isValidRut("12345678-5")).toBe(true);
    expect(isValidRut("123456785")).toBe(true);
    expect(isValidRut("12.345.678-9")).toBe(false);
    expect(isValidRut("no-es-rut")).toBe(false);
    expect(isValidRut("1-9")).toBe(false);
  });

  it("propiedad: cuerpo + su DV calculado siempre es valido", () => {
    for (const body of ["7654321", "20111222", "9000001", "18765432"]) {
      expect(isValidRut(`${body}-${computeDv(body)}`)).toBe(true);
    }
  });

  it("normaliza a cuerpo-dv", () => {
    expect(normalizeRut("12.345.678-5")).toBe("12345678-5");
    expect(() => normalizeRut("12.345.678-0")).toThrow();
  });

  it("formatea con puntos y guion", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });
});
