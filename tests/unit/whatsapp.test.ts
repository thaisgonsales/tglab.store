import { describe, expect, it } from "vitest";

import { buildWhatsappUrl, normalizePhone } from "@/lib/whatsapp";

describe("whatsapp", () => {
  it("normaliza el telefono a solo digitos", () => {
    expect(normalizePhone("+56 9 1234 5678")).toBe("56912345678");
  });

  it("construye la URL con mensaje y placeholders", () => {
    const url = buildWhatsappUrl(
      "+56912345678",
      "Hola, vi {producto} en TG LAB",
      { producto: "Soporte PS5" },
    );
    expect(url.startsWith("https://wa.me/56912345678?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toBe(
      "Hola, vi Soporte PS5 en TG LAB",
    );
  });
});
