import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";
import { db } from "@/server/db";
import {
  releaseReservations,
  reserveStock,
} from "@/server/services/inventory-service";
import {
  applyProviderPayment,
  type ProviderPaymentResult,
} from "@/server/payments/payment-service";

/**
 * Verifica la aplicación de un pago del proveedor al pedido:
 *  - monto insuficiente -> NO marca pagado (protección anti-manipulación)
 *  - aprobado -> marca PAID y descuenta el stock (consume reservas)
 *  - reintento del webhook -> idempotente (no descuenta dos veces)
 *  - rechazado -> conserva la reserva para permitir un nuevo intento seguro
 */

let variantId: string;
let productId: string;
let orderId: string;
let orderNumber: string;

async function setup(grandTotal: number) {
  const name = `ZZ Pago ${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const product = await db.product.create({
    data: {
      name,
      slug: slugify(name),
      status: "DRAFT",
      variants: { create: { optionsKey: "", price: grandTotal, stock: 10 } },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0]!.id;

  orderNumber = `TST-${Date.now()}${Math.floor(Math.random() * 9999)}`;
  const order = await db.order.create({
    data: {
      number: orderNumber,
      email: "pago@example.com",
      phone: "+56900000000",
      firstName: "P",
      lastName: "Q",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      subtotal: grandTotal,
      grandTotal,
      items: {
        create: {
          productId,
          variantId,
          productName: name,
          unitPrice: Math.floor(grandTotal / 2),
          quantity: 2,
          lineTotal: grandTotal,
        },
      },
    },
  });
  orderId = order.id;
  await db.$transaction((tx) =>
    reserveStock(tx, orderId, [
      { variantId, quantity: 2, productName: "Test" },
    ]),
  );
}

function mpResult(
  over: Partial<ProviderPaymentResult> = {},
): ProviderPaymentResult {
  return {
    provider: "MERCADOPAGO",
    providerReference: `mp-${Math.random().toString(36).slice(2)}`,
    status: "PAID",
    amountPaid: null,
    orderNumber,
    raw: { source: "test" },
    ...over,
  };
}

afterEach(async () => {
  await db.payment.deleteMany({ where: { orderId } });
  await db.stockReservation.deleteMany({ where: { orderId } });
  await db.inventoryMovement.deleteMany({ where: { variantId } });
  await db.documentRecord.deleteMany({ where: { orderId } });
  await db.orderStatusHistory.deleteMany({ where: { orderId } });
  await db.order.delete({ where: { id: orderId } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
});

describe("applyProviderPayment", () => {
  beforeEach(() => setup(10_000));

  it("rechaza un pago con monto menor al total del pedido", async () => {
    await applyProviderPayment(mpResult({ status: "PAID", amountPaid: 5_000 }));
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.paymentStatus).toBe("PENDING");
    const variant = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(10); // no se descontó
  });

  it("rechaza un pago aprobado sin monto verificable", async () => {
    await applyProviderPayment(mpResult({ status: "PAID", amountPaid: null }));
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.paymentStatus).toBe("PENDING");
  });

  it("aprueba y descuenta stock cuando el monto cubre el total", async () => {
    const res = mpResult({ status: "PAID", amountPaid: 10_000 });
    await applyProviderPayment(res);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.paymentStatus).toBe("PAID");
    expect(order.status).toBe("PAID");
    expect(order.paidAt).not.toBeNull();

    const variant = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(8);
    expect(variant.reservedStock).toBe(0);

    // El voucher del proveedor electrónico reemplaza la boleta según el
    // modelo declarado en SII; no debe quedar una boleta manual pendiente.
    expect(await db.documentRecord.count({ where: { orderId } })).toBe(0);

    // Reintento del webhook: no descuenta de nuevo.
    await applyProviderPayment(res);
    const variant2 = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant2.stock).toBe(8);
  });

  it("conserva las reservas cuando el pago es rechazado", async () => {
    await applyProviderPayment(
      mpResult({ status: "REJECTED", amountPaid: null }),
    );
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.paymentStatus).toBe("REJECTED");
    const variant = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.reservedStock).toBe(2);
    expect(variant.stock).toBe(10);

    await applyProviderPayment(
      mpResult({ status: "PAID", amountPaid: 10_000 }),
    );
    const paidVariant = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(paidVariant.reservedStock).toBe(0);
    expect(paidVariant.stock).toBe(8);
  });

  it("vuelve a reservar y descuenta stock si el pago llega después del vencimiento", async () => {
    await db.$transaction((tx) =>
      releaseReservations(tx, orderId, "Vencimiento de prueba"),
    );

    await applyProviderPayment(
      mpResult({ status: "PAID", amountPaid: 10_000 }),
    );

    const [order, variant] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: orderId } }),
      db.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
    ]);
    expect(order.paymentStatus).toBe("PAID");
    expect(order.internalNotes).toBeNull();
    expect(variant.stock).toBe(8);
    expect(variant.reservedStock).toBe(0);
  });

  it("registra alerta manual si un pago tardío llega sin stock", async () => {
    await db.$transaction((tx) =>
      releaseReservations(tx, orderId, "Vencimiento de prueba"),
    );
    await db.productVariant.update({
      where: { id: variantId },
      data: { stock: 0 },
    });

    await applyProviderPayment(
      mpResult({ status: "PAID", amountPaid: 10_000 }),
    );

    const [order, variant] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: orderId } }),
      db.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
    ]);
    expect(order.paymentStatus).toBe("PAID");
    expect(order.internalNotes).toContain("PAGO APROBADO SIN STOCK");
    expect(variant.stock).toBe(0);
    expect(variant.reservedStock).toBe(0);
  });
});
