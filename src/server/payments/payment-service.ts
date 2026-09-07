import "server-only";

import { nanoid } from "nanoid";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  consumeReservations,
  releaseReservations,
} from "@/server/services/inventory-service";
import type { PaymentProviderKey } from "@/server/payments/types";

export type ProviderPaymentResult = {
  provider: PaymentProviderKey;
  /** Id del pago en el proveedor (idempotencia). */
  providerReference: string;
  status: "PAID" | "PENDING" | "REJECTED" | "CANCELLED" | "REFUNDED";
  amountPaid: number | null;
  /** external_reference = número de pedido. */
  orderNumber: string;
  raw: unknown;
};

/**
 * Aplica el resultado de un pago del proveedor al pedido.
 *
 * - Idempotente: si el `providerReference` ya se procesó, no hace nada.
 * - Valida el monto: `amountPaid` debe cubrir `order.grandTotal` (nunca se
 *   confía en el monto que envía el proveedor sin compararlo con la BD).
 * - Pago aprobado -> marca PAID y CONSUME las reservas (baja el stock).
 * - Pago rechazado/cancelado -> libera las reservas.
 *
 * Devuelve el estado final del pedido.
 */
export async function applyProviderPayment(
  result: ProviderPaymentResult,
): Promise<{
  handled: boolean;
  orderPaymentStatus: string;
  transitionedToPaid: boolean;
  orderId: string | null;
}> {
  const outcome = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { number: result.orderNumber.toUpperCase().trim() },
    });
    if (!order) {
      return {
        handled: false,
        orderPaymentStatus: "UNKNOWN",
        transitionedToPaid: false,
        orderId: null,
      };
    }
    const base = {
      handled: true,
      transitionedToPaid: false,
      orderId: order.id,
    };

    // Idempotencia: ¿ya registramos este pago del proveedor?
    const existingPayment = await tx.payment.findUnique({
      where: {
        provider_providerReference: {
          provider: result.provider,
          providerReference: result.providerReference,
        },
      },
    });
    if (existingPayment && existingPayment.status === "PAID") {
      return { ...base, orderPaymentStatus: order.paymentStatus };
    }
    if (order.paymentStatus === "PAID") {
      return { ...base, orderPaymentStatus: "PAID" };
    }

    const rawPayload = result.raw as Prisma.InputJsonValue;

    if (result.status === "PAID") {
      // Protección contra manipulación del monto.
      if (
        result.amountPaid !== null &&
        result.amountPaid + 1 < order.grandTotal
      ) {
        await upsertPayment(tx, order.id, result, "REJECTED", rawPayload);
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            toStatus: order.status,
            note: `Pago rechazado: monto ${result.amountPaid} < total ${order.grandTotal}.`,
          },
        });
        return { ...base, orderPaymentStatus: order.paymentStatus };
      }

      await consumeReservations(tx, order.id);
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: order.status === "PENDING_PAYMENT" ? "PAID" : order.status,
          paidAt: new Date(),
        },
      });
      await upsertPayment(tx, order.id, result, "PAID", rawPayload);
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "PAID",
          note: `Pago aprobado (${result.provider} ${result.providerReference}).`,
        },
      });
      await tx.documentRecord.create({
        data: { orderId: order.id, type: "BOLETA", status: "PENDING" },
      });
      return { ...base, orderPaymentStatus: "PAID", transitionedToPaid: true };
    }

    if (result.status === "REJECTED" || result.status === "CANCELLED") {
      await releaseReservations(tx, order.id, `Pago ${result.status}`);
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:
            result.status === "REJECTED" ? "REJECTED" : "CANCELLED",
        },
      });
      await upsertPayment(tx, order.id, result, result.status, rawPayload);
      return { ...base, orderPaymentStatus: result.status };
    }

    // PENDING: solo registra el intento.
    await upsertPayment(tx, order.id, result, "PENDING", rawPayload);
    return { ...base, orderPaymentStatus: order.paymentStatus };
  });

  if (outcome.transitionedToPaid && outcome.orderId) {
    const { sendPaymentConfirmedEmail } =
      await import("@/server/email/order-emails");
    await sendPaymentConfirmedEmail(outcome.orderId);
  }

  return outcome;
}

async function upsertPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  result: ProviderPaymentResult,
  status: "PAID" | "PENDING" | "REJECTED" | "CANCELLED" | "REFUNDED",
  raw: Prisma.InputJsonValue,
) {
  await tx.payment.upsert({
    where: {
      provider_providerReference: {
        provider: result.provider,
        providerReference: result.providerReference,
      },
    },
    create: {
      orderId,
      provider: result.provider,
      providerReference: result.providerReference,
      status,
      amount: result.amountPaid ?? 0,
      amountPaid: result.amountPaid,
      idempotencyKey: nanoid(24),
      rawPayload: raw,
    },
    update: { status, amountPaid: result.amountPaid, rawPayload: raw },
  });
}
