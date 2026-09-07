import { describe, expect, it } from "vitest";

import {
  availableValueIds,
  resolveVariant,
  type SelectableAttribute,
  type SelectableVariant,
} from "@/lib/variant-select";

const attributes: SelectableAttribute[] = [
  {
    id: "color",
    name: "Color",
    type: "COLOR",
    values: [
      { id: "negro", label: "Negro", hex: "#000" },
      { id: "blanco", label: "Blanco", hex: "#fff" },
      { id: "rojo", label: "Rojo", hex: "#f00" },
    ],
  },
  {
    id: "modelo",
    name: "Modelo",
    type: "SELECT",
    values: [
      { id: "ps5", label: "PS5", hex: null },
      { id: "xbox", label: "Xbox", hex: null },
    ],
  },
];

const variants: SelectableVariant[] = [
  {
    id: "v1",
    price: 8990,
    compareAtPrice: null,
    stock: 4,
    sku: "A",
    options: { color: "negro", modelo: "ps5" },
  },
  {
    id: "v2",
    price: 8990,
    compareAtPrice: null,
    stock: 0,
    sku: "B",
    options: { color: "negro", modelo: "xbox" },
  },
  {
    id: "v3",
    price: 9990,
    compareAtPrice: null,
    stock: 2,
    sku: "C",
    options: { color: "blanco", modelo: "ps5" },
  },
];

describe("resolveVariant", () => {
  it("devuelve null si falta seleccionar un atributo", () => {
    expect(resolveVariant(variants, { color: "negro" }, attributes)).toBeNull();
  });

  it("resuelve la combinacion exacta", () => {
    expect(
      resolveVariant(variants, { color: "negro", modelo: "ps5" }, attributes)
        ?.id,
    ).toBe("v1");
  });

  it("devuelve null si la combinacion no existe", () => {
    expect(
      resolveVariant(variants, { color: "rojo", modelo: "ps5" }, attributes),
    ).toBeNull();
  });

  it("producto simple: primera variante", () => {
    expect(resolveVariant(variants, {}, [])?.id).toBe("v1");
  });
});

describe("availableValueIds", () => {
  it("marca solo valores que llevan a stock, dada la seleccion parcial", () => {
    // modelo=ps5 -> color negro (v1, stock 4) y blanco (v3, stock 2) tienen stock
    const set = availableValueIds(
      "color",
      variants,
      { modelo: "ps5" },
      attributes,
    );
    expect([...set].sort()).toEqual(["blanco", "negro"]);
  });

  it("color=negro -> solo modelo ps5 tiene stock (xbox agotado)", () => {
    const set = availableValueIds(
      "modelo",
      variants,
      { color: "negro" },
      attributes,
    );
    expect([...set]).toEqual(["ps5"]);
  });
});
