"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";

import type { OrderStatus } from "@/generated/prisma/client";
import {
  ActionError,
  ownerAction,
  staffAction,
} from "@/server/auth/action-guard";
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
  requestId: z.string().cuid(),
  reason: z.string().trim().min(3, "Indica un motivo").max(500),
  ownerConfirmation: z.string().trim().min(1),
});

/**
 * Cancela un pedido con motivo obligatorio.
 *  - Pedido NO pagado -> libera reservas, paymentStatus CANCELLED.
 *  - Pedido pagado -> queda marcado para revisión de reembolso (el reembolso
 *    del dinero se registra aparte con `markOrderRefunded`).
 */
export async function cancelOrder(input: z.infer<typeof cancelSchema>) {
  return ownerAction(async (session) => {
    const { orderId, requestId, reason, ownerConfirmation } =
      cancelSchema.parse(input);
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError("Pedido no encontrado.");
    const approvedRequest = await db.orderResolutionRequest.findFirst({
      where: {
        id: requestId,
        orderId,
        type: "CANCELLATION",
        status: "APPROVED",
        consumedAt: null,
      },
    });
    if (!approvedRequest)
      throw new ActionError(
        "Primero debes aprobar una solicitud de cancelación pendiente.",
      );
    if (ownerConfirmation.toUpperCase() !== order.number.toUpperCase()) {
      throw new ActionError(
        `Escribe ${order.number} para confirmar personalmente la cancelación.`,
      );
    }
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
      await tx.orderResolutionRequest.update({
        where: { id: requestId },
        data: { consumedAt: new Date() },
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
  requestId: z.string().cuid(),
  amount: z.coerce.number().int().min(1),
  reference: z
    .string()
    .trim()
    .min(3, "Ingresa la referencia del reembolso real")
    .max(120),
  restock: z.boolean().default(false),
  reason: z
    .string()
    .trim()
    .min(3, "Indica el motivo de la devolución")
    .max(500),
  refundReason: z.enum([
    "CHANGE_OF_MIND",
    "DEFECT_OR_NONCONFORMITY",
    "AGREED_EXCEPTION",
  ]),
  ownerConfirmation: z.string().trim().min(1),
  deliveryReviewed: z.literal(true),
  moneyReturned: z.literal(true),
});

/**
 * Registra un reembolso ya realizado por fuera (Mercado Pago / transferencia).
 * No mueve dinero — deja la trazabilidad y, opcionalmente, repone stock.
 * (La integración con la API de reembolsos del proveedor es una fase posterior.)
 */
export async function markOrderRefunded(input: z.input<typeof refundSchema>) {
  return ownerAction(async (session) => {
    const data = refundSchema.parse(input);
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: { items: true, payments: true, documents: true },
    });
    if (!order) throw new ActionError("Pedido no encontrado.");
    const approvedRequest = await db.orderResolutionRequest.findFirst({
      where: {
        id: data.requestId,
        orderId: data.orderId,
        type: { in: ["REFUND", "RETURN"] },
        status: "APPROVED",
        consumedAt: null,
      },
    });
    if (!approvedRequest)
      throw new ActionError(
        "Primero debes aprobar una solicitud de devolución o reembolso.",
      );
    if (data.ownerConfirmation.toUpperCase() !== order.number.toUpperCase()) {
      throw new ActionError(
        `Escribe ${order.number} para confirmar personalmente el registro.`,
      );
    }
    if (order.paymentStatus !== "PAID") {
      throw new ActionError("Solo se puede reembolsar un pedido pagado.");
    }
    if (
      data.refundReason === "CHANGE_OF_MIND" &&
      order.items.some((item) => item.isPersonalized)
    ) {
      throw new ActionError(
        "Este pedido contiene productos personalizados y no admite devolución por cambio de opinión. Solo corresponde gestionar una falla, una diferencia con lo acordado o una excepción autorizada.",
      );
    }
    const alreadyRefunded = order.payments.reduce(
      (total, payment) =>
        payment.status === "REFUNDED" && (payment.amountPaid ?? 0) < 0
          ? total + Math.abs(payment.amountPaid ?? 0)
          : total,
      0,
    );
    const refundable = order.grandTotal - alreadyRefunded;
    if (data.amount > refundable) {
      throw new ActionError(
        `El monto supera el saldo reembolsable (${refundable}).`,
      );
    }
    const fullRefund = data.amount === refundable;
    if (data.restock && (!fullRefund || alreadyRefunded > 0)) {
      throw new ActionError(
        "El stock completo solo puede reponerse en la primera devolución cuando cubre todo el pedido.",
      );
    }
    const originalPayment = order.payments.find(
      (payment) => payment.status === "PAID" && (payment.amountPaid ?? 0) > 0,
    );
    if (!originalPayment) {
      throw new ActionError("No se encontró el pago original confirmado.");
    }
    if (
      originalPayment.provider === "BANK_TRANSFER" &&
      order.documents.some(
        (document) =>
          document.type === "BOLETA" && document.status !== "ISSUED",
      )
    ) {
      throw new ActionError(
        "Primero emite y registra la boleta pendiente. Luego registra el reembolso para que se genere la tarea de nota de crédito.",
      );
    }
    const duplicateReference = await db.payment.findFirst({
      where: { providerReference: data.reference },
      select: { id: true },
    });
    if (duplicateReference) {
      throw new ActionError("La referencia de reembolso ya fue registrada.");
    }

    await db.$transaction(async (tx) => {
      const refundPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: originalPayment.provider,
          providerReference: data.reference,
          status: "REFUNDED",
          amount: data.amount,
          amountPaid: -data.amount,
          idempotencyKey: nanoid(24),
          rawPayload: {
            reason: data.reason,
            refundReason: data.refundReason,
            recordedManually: true,
          },
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: fullRefund ? "REFUNDED" : "PAID",
          status: order.status === "CANCELLED" ? "CANCELLED" : order.status,
        },
      });

      const issuedBoleta = order.documents.find(
        (document) =>
          document.type === "BOLETA" && document.status === "ISSUED",
      );
      if (issuedBoleta) {
        await tx.documentRecord.create({
          data: {
            orderId: order.id,
            type: "NOTA_CREDITO",
            status: "PENDING",
            amount: data.amount,
            rawPayload: {
              refundPaymentId: refundPayment.id,
              originalDocumentId: issuedBoleta.id,
              originalFolio: issuedBoleta.folio,
              reason: data.reason,
            },
          },
        });
      }

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
          note: `${fullRefund ? "Reembolso total" : "Reembolso parcial"} registrado por ${data.amount} (ref: ${data.reference})${data.restock ? " · stock repuesto" : ""}. Causal: ${data.refundReason}. Motivo: ${data.reason}.${issuedBoleta ? " Nota de crédito pendiente en SII." : " Verificar reversa del voucher en el RCV."}`,
          adminUserId: session.user.id,
        },
      });
      await tx.orderResolutionRequest.update({
        where: { id: data.requestId },
        data: { consumedAt: new Date() },
      });
    });

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}

const resolutionRequestSchema = z.object({
  orderId: z.string().cuid(),
  type: z.enum(["CANCELLATION", "RETURN", "REFUND"]),
  channel: z.enum(["WHATSAPP", "EMAIL", "PHONE", "OTHER"]),
  reason: z.string().trim().min(3).max(1000),
});

export async function recordResolutionRequest(
  input: z.input<typeof resolutionRequestSchema>,
) {
  return staffAction(async (session) => {
    const data = resolutionRequestSchema.parse(input);
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      select: { status: true },
    });
    if (!order) throw new ActionError("Pedido no encontrado.");
    await db.$transaction(async (tx) => {
      await tx.orderResolutionRequest.create({
        data: {
          ...data,
          createdById: session.user.id,
          createdByName: session.user.name,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: data.orderId,
          toStatus: order.status,
          note: `Solicitud ${data.type} recibida por ${data.channel}; pendiente de decisión.`,
          adminUserId: session.user.id,
        },
      });
    });
    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}

const decideResolutionSchema = z.object({
  orderId: z.string().cuid(),
  requestId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().min(3).max(1000),
});

export async function decideResolutionRequest(
  input: z.input<typeof decideResolutionSchema>,
) {
  return ownerAction(async (session) => {
    const data = decideResolutionSchema.parse(input);
    const request = await db.orderResolutionRequest.findFirst({
      where: { id: data.requestId, orderId: data.orderId, status: "PENDING" },
      include: { order: { select: { status: true } } },
    });
    if (!request)
      throw new ActionError("La solicitud ya fue resuelta o no existe.");
    await db.$transaction(async (tx) => {
      await tx.orderResolutionRequest.update({
        where: { id: request.id },
        data: {
          status: data.decision,
          decisionNote: data.note,
          decidedAt: new Date(),
          decidedById: session.user.id,
          decidedByName: session.user.name,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: data.orderId,
          toStatus: request.order.status,
          note: `Solicitud ${request.type} ${data.decision === "APPROVED" ? "aprobada" : "rechazada"}. ${data.note}`,
          adminUserId: session.user.id,
        },
      });
    });
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

const manualCreditNoteSchema = z.object({
  orderId: z.string().cuid(),
  documentId: z.string().cuid(),
  folio: z.string().trim().min(1, "Ingresa el folio").max(80),
  issuedAt: z.coerce.date(),
});

/** Registra una nota de crédito emitida realmente en el portal del SII. */
export async function recordManualCreditNote(
  input: z.input<typeof manualCreditNoteSchema>,
) {
  return staffAction(async (session) => {
    const data = manualCreditNoteSchema.parse(input);
    const document = await db.documentRecord.findFirst({
      where: {
        id: data.documentId,
        orderId: data.orderId,
        type: "NOTA_CREDITO",
      },
      include: { order: { select: { status: true } } },
    });
    if (!document) throw new ActionError("Nota de crédito no encontrada.");
    if (document.status === "ISSUED") {
      throw new ActionError("La nota de crédito ya fue registrada.");
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
          note: `Nota de crédito emitida manualmente en SII · folio ${data.folio} · monto ${document.amount ?? 0}.`,
          adminUserId: session.user.id,
        },
      });
    });

    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}
