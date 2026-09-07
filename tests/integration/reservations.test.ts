import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";
import { db } from "@/server/db";
import {
  OutOfStockError,
  consumeReservations,
  releaseReservations,
  reserveStock,
} from "@/server/services/inventory-service";

/**
 * Verifica las garantías de inventario del checkout:
 *  - el stock NO baja al reservar (solo `reservedStock`)
 *  - dos reservas que superan el stock -> la segunda falla (anti-sobreventa)
 *  - al consumir baja el stock y queda movimiento SALE
 *  - al liberar vuelve la disponibilidad
 */

let productId: string;
let variantId: string;
const orders: string[] = [];

async function makeOrder(): Promise<string> {
  const o = await db.order.create({
    data: {
      number: `TST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: "test@example.com",
      phone: "+56900000000",
      firstName: "Test",
      lastName: "User",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      subtotal: 0,
      grandTotal: 0,
    },
  });
  orders.push(o.id);
  return o.id;
}

beforeAll(async () => {
  const name = `ZZ Test Reservas ${Date.now()}`;
  const product = await db.product.create({
    data: {
      name,
      slug: slugify(name),
      type: "SIMPLE",
      status: "DRAFT",
      variants: { create: { optionsKey: "", price: 1000, stock: 5 } },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0]!.id;
});

afterAll(async () => {
  await db.stockReservation.deleteMany({ where: { variantId } });
  await db.inventoryMovement.deleteMany({ where: { variantId } });
  await db.order.deleteMany({ where: { id: { in: orders } } });
  await db.product.delete({ where: { id: productId } });
});

describe("reservas de stock", () => {
  it("reservar no baja el stock real", async () => {
    const orderId = await makeOrder();
    await db.$transaction((tx) =>
      reserveStock(tx, orderId, [
        { variantId, quantity: 2, productName: "Test" },
      ]),
    );

    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.stock).toBe(5);
    expect(v.reservedStock).toBe(2);

    const res = await db.stockReservation.findFirst({
      where: { orderId, variantId },
    });
    expect(res?.status).toBe("HELD");
    expect(res?.quantity).toBe(2);
  });

  it("no permite sobreventa: la segunda reserva que excede el stock falla", async () => {
    const orderId = await makeOrder();
    await expect(
      db.$transaction((tx) =>
        reserveStock(tx, orderId, [
          { variantId, quantity: 4, productName: "Test" },
        ]),
      ),
    ).rejects.toBeInstanceOf(OutOfStockError);

    // La transacción falló entera: no quedó reserva ni cambió reservedStock.
    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.reservedStock).toBe(2);
  });

  it("liberar devuelve la disponibilidad", async () => {
    const firstOrder = orders[0]!;
    await releaseReservations(db, firstOrder, "test");
    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.reservedStock).toBe(0);
    expect(v.stock).toBe(5);
    const res = await db.stockReservation.findFirst({
      where: { orderId: firstOrder },
    });
    expect(res?.status).toBe("RELEASED");
  });

  it("consumir baja el stock real y registra la venta", async () => {
    const orderId = await makeOrder();
    await db.$transaction((tx) =>
      reserveStock(tx, orderId, [
        { variantId, quantity: 3, productName: "Test" },
      ]),
    );
    await db.$transaction((tx) => consumeReservations(tx, orderId));

    const v = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(v.stock).toBe(2);
    expect(v.reservedStock).toBe(0);

    const sale = await db.inventoryMovement.findFirst({
      where: { variantId, type: "SALE", orderId },
    });
    expect(sale?.quantityDelta).toBe(-3);
    expect(sale?.stockAfter).toBe(2);
  });
});
