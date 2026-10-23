import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { expect, test, type Page } from "@playwright/test";

test("admin: navegación, variantes y diálogos en pantallas estrechas", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const scope = `e2e-account-${randomUUID()}`;
  const password = `E2E-${randomUUID()}`;
  const fixture = (action: "prepare" | "cleanup") =>
    execFileSync(
      process.execPath,
      [
        "--env-file=.env",
        "--conditions=react-server",
        "--import",
        "tsx",
        "tests/e2e/account-fixtures.ts",
      ],
      {
        input: JSON.stringify({ action, scope, password, responsive: true }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

  async function noOverflow() {
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
  }

  async function signIn(page: Page) {
    await page.goto("/admin/login");
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill(`${scope}-owner@example.com`);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/setup-2fa$/);
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .last()
      .fill(password);
    await page
      .getByRole("button", {
        name: "Activar verificación en dos pasos",
        exact: true,
      })
      .click();
    const secret = new TextDecoder().decode(
      base32.decode((await page.locator("code").textContent())!),
    );
    await page
      .getByLabel("Código de verificación", { exact: true })
      .fill(await createOTP(secret).totp());
    await page
      .getByRole("button", { name: "Confirmar código", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin$/);
  }

  fixture("prepare");
  try {
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.211.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`,
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await signIn(page);
    await noOverflow();
    await page.getByRole("button", { name: /Abrir menú/ }).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Productos", exact: true }).click();
    await expect(menu).not.toBeVisible();
    await page.locator("main").getByRole("textbox").fill(scope);
    await page.locator("main form").press("Enter");
    await page
      .getByRole("link", { name: /Producto de prueba de cuenta/ })
      .click();
    await expect(page.getByLabel("SKU", { exact: true })).toBeVisible();
    for (const width of [320, 390, 767, 1280]) {
      await page.setViewportSize({ width, height: 740 });
      await noOverflow();
      await expect(page.getByLabel("Precio", { exact: true })).toBeVisible();
      if (width === 390) {
        await page.getByLabel("SKU", { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: test.info().outputPath("variantes-mobile.png"),
        });
      }
    }
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/admin/categorias");
    await page
      .getByRole("button", { name: "Nueva categoría", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.setViewportSize({ width: 320, height: 360 });
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box ? box.y >= 0 && box.y + box.height <= 361 : false;
      })
      .toBe(true);
    await dialog
      .getByRole("button", { name: "Guardar", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole("button", { name: "Guardar", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath("dialogo-mobile.png"),
    });
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await noOverflow();
  } finally {
    fixture("cleanup");
  }
});
