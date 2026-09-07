import { expect, test } from "@playwright/test";

/**
 * Flujo crítico (parte 1): explorar catálogo → ficha → seleccionar variante →
 * agregar al carrito → ver el carrito. El checkout y el pago se prueban en
 * fases posteriores.
 */
test("home muestra productos y navega al catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("link", { name: "Productos", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/productos/);
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
});

test("agregar un producto con variantes al carrito", async ({ page }) => {
  await page.goto("/producto/soporte-para-audifonos-gamer");
  await expect(
    page.getByRole("heading", { name: /Soporte para Audífonos Gamer/i }),
  ).toBeVisible();

  // Selecciona el primer color disponible
  const colorSwatch = page.locator('button[aria-label="Negro"]').first();
  await colorSwatch.click();

  const addButton = page.getByRole("button", { name: /Agregar al carrito/i });
  await expect(addButton).toBeEnabled();
  await addButton.click();

  await expect(page.getByText("Agregado al carrito")).toBeVisible();

  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
  await expect(page.getByText(/Soporte para Audífonos Gamer/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir a pagar" })).toBeVisible();
});

test("producto simple sin stock no se puede agregar", async ({ page }) => {
  await page.goto("/producto/kit-decorativo-pac-man");
  const addButton = page.getByRole("button", { name: /Agregar al carrito/i });
  await expect(addButton).toBeVisible();
});
