"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";

import type { OrderStatus } from "@/generated/prisma/client";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import {
  recordMovement,
  releaseReservations,
} from "@/server/services/inventory-service";
import { sendOrderStatusEmail } from "@/server/email/order-emails";

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const changeStatusSchema = z.object({
  orderId: z.string().cuid(),
  toStatus: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PREPARING",
    "READY_FOR_PICKUP",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function changeOrderStatus(
  input: z.infer<typeof changeStatusSchema>,
) {
  return staffAction(async (session) => {
    const { orderId, toStatus, note } = changeStatusSchema.parse(input);
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError("Pedido no encontrado.");

    if (toStatus === "CANCELLED") {
      throw new ActionError(
        "Usa la acción de cancelar pedido (pide un motivo).",
      );
    }
    if (
      toStatus !== order.status &&
      !STATUS_FLOW[order.status]?.includes(toStatus)
    ) {
      throw new ActionError(
        `No se puede pasar de "${order.status}" a "${toStatus}".`,
      );
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: toStatus },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus,
          note: note || null,
          adminUserId: session.user.id,
        },
      });
    });

    await sendOrderStatusEmail(orderId, toStatus);

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return null;
  });
}

const cancelSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.string().trim().min(3, "Indica un motivo").max(500),
});

/**
 * Cancela un pedido con motivo obligatorio.
 *  - Pedido NO pagado -> libera reservas, paymentStatus CANCELLED.
 *  - Pedido pagado -> queda marcado para revisión de reembolso (el reembolso
 *    del dinero se registra aparte con `markOrderRefunded`).
 */
export async function cancelOrder(input: z.infer<typeof cancelSchema>) {
  return staffAction(async (session) => {
    const { orderId, reason } = cancelSchema.parse(input);
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError("Pedido no encontrado.");
    if (order.status === "CANCELLED") {
      throw new ActionError("El pedido ya está cancelado.");
    }
    if (order.status === "DELIVERED") {
      throw new ActionError(
        "No se puede cancelar un pedido ya entregado. Registra un reembolso o devolución.",
      );
    }

    const wasPaid = order.paymentStatus === "PAID";

    await db.$transaction(async (tx) => {
      if (!wasPaid) {
        await releaseReservations(tx, orderId, `Cancelado: ${reason}`);
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          ...(wasPaid ? {} : { paymentStatus: "CANCELLED" }),
          internalNotes: [
            order.internalNotes,
            `Cancelado (${new Date().toISOString()}): ${reason}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: "CANCELLED",
          note: wasPaid
            ? `Cancelado con pago recibido — pendiente de reembolso. Motivo: ${reason}`
            : `Cancelado. Motivo: ${reason}`,
          adminUserId: session.user.id,
        },
      });
    });

    await sendOrderStatusEmail(orderId, "CANCELLED", {
      cancellationReason: reason,
    });

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { pendingRefund: wasPaid };
  });
}

const refundSchema = z.object({
  orderId: z.string().cuid(),
  amount: z.coerce.number().int().min(1),
  reference: z.string().trim().max(120).optional(),
  restock: z.boolean().default(true),
  note: z.string().trim().max(500).optional(),
});

/**
 * Registra un reembolso ya realizado por fuera (Mercado Pago / transferencia).
 * No mueve dinero — deja la trazabilidad y, opcionalmente, repone stock.
 * (La integración con la API de reembolsos del proveedor es una fase posterior.)
 */
export async function markOrderRefunded(input: z.input<typeof refundSchema>) {
  return staffAction(async (session) => {
    const data = refundSchema.parse(input);
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) throw new ActionError("Pedido no encontrado.");
    if (order.paymentStatus !== "PAID") {
      throw new ActionError("Solo se puede reembolsar un pedido pagado.");
    }
    if (data.amount > order.grandTotal) {
      throw new ActionError("El monto supera el total del pedido.");
    }

    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "BANK_TRANSFER",
          providerReference: data.reference || `REFUND-${nanoid(10)}`,
          status: "REFUNDED",
          amount: order.grandTotal,
          amountPaid: -data.amount,
          idempotencyKey: nanoid(24),
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          status: order.status === "CANCELLED" ? "CANCELLED" : order.status,
        },
      });

      if (data.restock) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true },
          });
          if (!variant) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: variant.stock + item.quantity },
          });
          await recordMovement(tx, {
            variantId: item.variantId,
            type: "RETURN",
            quantityDelta: item.quantity,
            stockBefore: variant.stock,
            stockAfter: variant.stock + item.quantity,
            reason: "Reembolso / devolución",
            orderId: order.id,
            adminUserId: session.user.id,
          });
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          toStatus: order.status,
          note: `Reembolso registrado por ${data.amount}${data.reference ? ` (ref: ${data.reference})` : ""}${data.restock ? " · stock repuesto" : ""}${data.note ? ` · ${data.note}` : ""}.`,
          adminUserId: session.user.id,
        },
      });
    });

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}

const trackingSchema = z.object({
  orderId: z.string().cuid(),
  carrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(2000).optional(),
  notifyCustomer: z.boolean().default(false),
});

export async function updateOrderTracking(
  input: z.input<typeof trackingSchema>,
) {
  return staffAction(async () => {
    const data = trackingSchema.parse(input);
    const order = await db.order.update({
      where: { id: data.orderId },
      data: {
        carrier: data.carrier || null,
        trackingNumber: data.trackingNumber || null,
        trackingUrl: data.trackingUrl || null,
        internalNotes: data.internalNotes || null,
      },
      select: { status: true },
    });

    if (data.notifyCustomer && data.trackingNumber) {
      await sendOrderStatusEmail(data.orderId, order.status);
    }

    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}

const manualBoletaSchema = z.object({
  orderId: z.string().cuid(),
  documentId: z.string().cuid(),
  folio: z.string().trim().min(1, "Ingresa el folio").max(80),
  issuedAt: z.coerce.date(),
});

/** Registra una boleta que ya fue emitida manualmente en el SII. */
export async function recordManualBoleta(
  input: z.input<typeof manualBoletaSchema>,
) {
  return staffAction(async (session) => {
    const data = manualBoletaSchema.parse(input);
    const document = await db.documentRecord.findFirst({
      where: {
        id: data.documentId,
        orderId: data.orderId,
        type: "BOLETA",
      },
      include: {
        order: { select: { number: true, paymentStatus: true, status: true } },
      },
    });
    if (!document) throw new ActionError("Documento no encontrado.");
    if (document.order.paymentStatus !== "PAID") {
      throw new ActionError(
        "Solo se puede emitir la boleta de un pedido pagado.",
      );
    }
    if (document.status === "ISSUED") {
      throw new ActionError("La boleta ya fue registrada como emitida.");
    }

    await db.$transaction(async (tx) => {
      await tx.documentRecord.update({
        where: { id: document.id },
        data: {
          status: "ISSUED",
          folio: data.folio,
          issuedAt: data.issuedAt,
          provider: "SII_MANUAL",
          externalReference: data.folio,
          errorMessage: null,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: data.orderId,
          toStatus: document.order.status,
          note: `Boleta emitida manualmente en SII · folio ${data.folio}.`,
          adminUserId: session.user.id,
        },
      });
    });

    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}
