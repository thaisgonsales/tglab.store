import { expect, test } from "@playwright/test";

test("enviar una solicitud de producto personalizado", async ({ page }) => {
  await page.goto("/personalizados");
  await expect(
    page.getByText(/no constituye automáticamente una compra/i).first(),
  ).toBeVisible();

  await page.getByLabel("Nombre").fill("Valentina");
  await page.getByLabel("Email").fill("vale.custom@example.com");
  await page
    .getByLabel(/Descripción de lo que necesitas/i)
    .fill(
      "Quiero un llavero personalizado con el texto THAIS en color rosado.",
    );

  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(
    page.getByRole("heading", { name: /Solicitud enviada/i }),
  ).toBeVisible();
});
