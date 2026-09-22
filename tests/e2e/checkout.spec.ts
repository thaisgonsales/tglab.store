import { expect, test } from "@playwright/test";

/**
 * Flujo crítico (parte 2): carrito → checkout como invitado (retiro) →
 * creación del pedido → página de pago. El pago con Mercado Pago se prueba
 * cuando se conecten las credenciales (Fase 8).
 */
test("checkout de invitado con retiro crea un pedido", async ({ page }) => {
  // Agrega un producto simple con stock
  await page.goto("/producto/decoracion-gamer-playstation");
  await page.getByRole("button", { name: /Agregar al carrito/i }).click();
  await expect(page.getByText("Agregado al carrito")).toBeVisible();

  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Finalizar compra" }),
  ).toBeVisible();

  await page.getByLabel("Nombre", { exact: true }).fill("Camila");
  await page.getByLabel("Apellido", { exact: true }).fill("Soto");
  await page.getByLabel("RUT", { exact: true }).fill("11111111-1");
  await page.getByLabel("Teléfono", { exact: true }).fill("+56 9 1234 5678");
  await page
    .getByLabel("Email", { exact: true })
    .fill("camila.test@example.com");

  // Retiro está preseleccionado (pickupEnabled en el seed)
  await page.getByRole("button", { name: "Retiro" }).click();

  // Las condiciones son obligatorias y se validan antes de crear el pedido.
  await page.getByRole("button", { name: /Continuar al pago/i }).click();
  await expect(
    page.getByText("Debes aceptar los términos y la política de privacidad"),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /Acepto los términos/i }).check();
  await page.getByRole("button", { name: /Continuar al pago/i }).click();

  // Redirige a /checkout/pago/TG-XXXXXX
  await expect(page).toHaveURL(/\/checkout\/pago\/TG-\d+/);
  const orderNumber = page.url().match(/TG-\d+/)?.[0] ?? "";
  expect(orderNumber).toMatch(/^TG-\d+$/);
  await expect(page.getByRole("heading", { name: /TG-\d+/ })).toBeVisible();
  await expect(page.getByText(/Estado del pago/i)).toBeVisible();
  await expect(page.getByText(/Pendiente/i).first()).toBeVisible();

  // El carrito quedó vacío tras crear el pedido
  await page.goto("/carrito");
  await expect(page.getByText(/Todavía no agregaste productos/i)).toBeVisible();

  // Seguimiento público con número + email
  await page.goto(`/pedido?numero=${orderNumber}`);
  await page.getByLabel("Email de compra").fill("camila.test@example.com");
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(orderNumber) }),
  ).toBeVisible();
  await expect(page.getByText("Pedido recibido")).toBeVisible();
});
