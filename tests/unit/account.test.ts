import { describe, expect, it } from "vitest";
import {
  safeAuthRedirect,
  registrationSchema,
  profileSchema,
} from "@/lib/schemas/account";

describe("destinos de autenticación", () => {
  it.each([
    "https://example.com",
    "//example.com",
    "javascript:alert(1)",
    "/\\example.com",
    "/admin/login",
    "/admin/recuperar",
    "/%2fexample.com",
    "/admin\n",
  ])("descarta %s", (value) => {
    expect(safeAuthRedirect(value, true)).toBe("/admin");
  });
  it("conserva destinos locales y separa clientes y administración", () => {
    expect(safeAuthRedirect("/checkout")).toBe("/checkout");
    expect(safeAuthRedirect("/admin/productos", true)).toBe("/admin/productos");
    expect(safeAuthRedirect("/admin/productos")).toBe("/cuenta");
    expect(safeAuthRedirect("/cuenta/login")).toBe("/cuenta");
  });
});

describe("datos de cuentas", () => {
  const valid = {
    name: "Ana Pérez",
    email: "ANA@example.com",
    password: "una-frase-segura",
    confirmPassword: "una-frase-segura",
    terms: true,
  };
  it("normaliza el correo y exige confirmación", () => {
    expect(registrationSchema.parse(valid).email).toBe("ana@example.com");
    expect(
      registrationSchema.safeParse({ ...valid, confirmPassword: "otra" })
        .success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...valid, terms: false }).success,
    ).toBe(false);
  });
  it("no admite cambios de identidad ni rol en el perfil", () => {
    const parsed = profileSchema.parse({
      firstName: "Ana",
      lastName: "Pérez",
      phone: "",
      rut: "",
      email: "other@example.com",
      role: "owner",
      isActive: true,
    });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("isActive");
  });
});
