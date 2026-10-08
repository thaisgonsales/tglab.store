import { describe, expect, it } from "vitest";

import { parseEnviaPostalCode } from "@/lib/envia-geocodes";

describe("parseEnviaPostalCode", () => {
  it("obtiene un código postal único para la comuna", () => {
    expect(
      parseEnviaPostalCode(
        [
          {
            zip_codes: [{ zip_code: "5770000", locality: "Chonchí" }],
          },
        ],
        "Chonchi",
      ),
    ).toBe("5770000");
  });

  it("no elige arbitrariamente cuando hay más de un código", () => {
    expect(
      parseEnviaPostalCode(
        [
          {
            zip_codes: [
              { zip_code: "1111111", locality: "Comuna" },
              { zip_code: "2222222", locality: "Comuna" },
            ],
          },
        ],
        "Comuna",
      ),
    ).toBeNull();
  });

  it("rechaza respuestas inválidas sin inventar un código", () => {
    expect(parseEnviaPostalCode({ error: true }, "Castro")).toBeNull();
  });
});
