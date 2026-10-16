import { expect, test } from "@playwright/test";

test("la tienda y el panel publican manifiestos instalables", async ({
  page,
  request,
}) => {
  const storeManifestResponse = await request.get("/manifest.webmanifest");
  expect(storeManifestResponse.ok()).toBeTruthy();
  expect(storeManifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const storeManifest = await storeManifestResponse.json();
  expect(storeManifest).toMatchObject({
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es-CL",
  });
  expect(storeManifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icon.png", sizes: "512x512" }),
    ]),
  );

  const adminManifestResponse = await request.get("/admin.webmanifest");
  expect(adminManifestResponse.ok()).toBeTruthy();
  const adminManifest = await adminManifestResponse.json();
  expect(adminManifest).toMatchObject({
    id: "/admin",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
  });

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );

  await page.goto("/admin/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/admin.webmanifest",
  );
});

test("el service worker queda registrado sin cachear datos privados", async ({
  page,
  request,
}) => {
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBeTruthy();
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/");

  await page.goto("/");
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(scope).toBe("http://localhost:3100/");

  const cachedUrls = await page.evaluate(async () => {
    const cache = await caches.open("tglab-pwa-v1");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cachedUrls).toEqual(
    expect.arrayContaining(["/sin-conexion", "/icon.png", "/apple-icon.png"]),
  );
  expect(cachedUrls.some((url) => url.startsWith("/admin"))).toBe(false);
  expect(cachedUrls.some((url) => url.startsWith("/api"))).toBe(false);
});
