import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

const previousMaintenance = process.env.STORE_MAINTENANCE_MODE;

afterEach(() => {
  if (previousMaintenance === undefined) {
    delete process.env.STORE_MAINTENANCE_MODE;
  } else {
    process.env.STORE_MAINTENANCE_MODE = previousMaintenance;
  }
});

describe("modo mantenimiento", () => {
  it("responde 503 y reescribe las páginas públicas", () => {
    process.env.STORE_MAINTENANCE_MODE = "true";
    const response = proxy(new NextRequest("https://tglab.cl/productos"));

    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://tglab.cl/mantenimiento",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("mantiene disponibles el login administrativo y la salud", () => {
    process.env.STORE_MAINTENANCE_MODE = "true";

    const admin = proxy(new NextRequest("https://tglab.cl/admin/login"));
    const health = proxy(new NextRequest("https://tglab.cl/api/health"));

    expect(admin.status).toBe(200);
    expect(admin.headers.get("x-middleware-rewrite")).toBeNull();
    expect(health.status).toBe(200);
    expect(health.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
