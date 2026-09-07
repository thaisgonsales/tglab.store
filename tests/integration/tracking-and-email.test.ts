import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { sendOrderReceivedEmail } from "@/server/email/order-emails";
import { lookupOrderTracking } from "@/server/actions/tracking-actions";

let orderId: string;
let orderNumber: string;
const EMAIL = "track@example.com";

beforeAll(async () => {
  orderNumber = `TST-${Date.now()}${Math.floor(Math.random() * 9999)}`;
  const order = await db.order.create({
    data: {
      number: orderNumber,
      email: EMAIL,
      phone: "+56900000000",
      firstName: "Ana",
      lastName: "Pérez",
      status: "PREPARING",
      paymentStatus: "PAID",
      fulfillmentMethod: "SHIPPING",
      subtotal: 12000,
      shippingTotal: 3000,
      grandTotal: 15000,
      carrier: "Starken",
      trackingNumber: "ST-123",
      items: {
        create: {
          productName: "Lámpara Gamer",
          variantLabel: "Rosado",
          unitPrice: 12000,
          quantity: 1,
          lineTotal: 12000,
        },
      },
      statusHistory: {
        create: [
          { toStatus: "PENDING_PAYMENT", note: "Pedido creado" },
          { fromStatus: "PENDING_PAYMENT", toStatus: "PAID", note: "Pago" },
          { fromStatus: "PAID", toStatus: "PREPARING" },
        ],
      },
    },
  });
  orderId = order.id;
});

afterAll(async () => {
  await db.orderStatusHistory.deleteMany({ where: { orderId } });
  await db.orderItem.deleteMany({ where: { orderId } });
  await db.order.delete({ where: { id: orderId } }).catch(() => {});
});

describe("seguimiento público de pedido", () => {
  it("devuelve el timeline solo con número + email correctos", async () => {
    const res = await lookupOrderTracking({
      number: orderNumber,
      email: EMAIL,
    });
    expect(res.ok).toBe(true);
    if (!res.ok || !res.data) throw new Error("sin datos");
    expect(res.data.status).toBe("En preparación");
    const done = res.data.steps.filter((s) => s.done).map((s) => s.key);
    expect(done).toContain("received");
    expect(done).toContain("paid");
    const current = res.data.steps.find((s) => s.current);
    expect(current?.key).toBe("preparing");
    expect(res.data.tracking.number).toBe("ST-123");
  });

  it("rechaza si el email no coincide", async () => {
    const res = await lookupOrderTracking({
      number: orderNumber,
      email: "otro@example.com",
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza número inexistente", async () => {
    const res = await lookupOrderTracking({
      number: "TG-999999",
      email: EMAIL,
    });
    expect(res.ok).toBe(false);
  });
});

describe("emails transaccionales", () => {
  it("construye y 'envía' (consola en dev) sin lanzar", async () => {
    const result = await sendOrderReceivedEmail(orderId);
    expect(["console", "resend", "none"]).toContain(result.provider);
  });
});
