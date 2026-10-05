import "server-only";

import { nanoid } from "nanoid";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  consumeReservations,
  OutOfStockError,
  reserveStock,
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
 * - Pago rechazado/cancelado -> conserva la reserva hasta el vencimiento para
 *   permitir un nuevo intento sin perder la protección contra sobreventa.
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
      include: {
        items: {
          select: {
            variantId: true,
            quantity: true,
            productName: true,
          },
        },
      },
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

    const rawPayload = result.raw as Prisma.InputJsonValue;

    // Idempotencia: ¿ya registramos este pago del proveedor?
    const existingPayment = await tx.payment.findUnique({
      where: {
        provider_providerReference: {
          provider: result.provider,
          providerReference: result.providerReference,
        },
      },
    });
    if (result.status === "REFUNDED") {
      if (existingPayment?.status !== "REFUNDED") {
        await upsertPayment(tx, order.id, result, "REFUNDED", rawPayload);
        const warning = `Mercado Pago informó reembolso o contracargo (${result.providerReference}). Revisión manual obligatoria; no se repuso stock ni se cambió el pedido automáticamente.`;
        await tx.order.update({
          where: { id: order.id },
          data: {
            internalNotes: [order.internalNotes, warning]
              .filter(Boolean)
              .join("\n"),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: order.status,
            note: warning,
          },
        });
      }
      return { ...base, orderPaymentStatus: order.paymentStatus };
    }
    if (existingPayment && existingPayment.status === "PAID") {
      return { ...base, orderPaymentStatus: order.paymentStatus };
    }
    if (order.paymentStatus === "PAID") {
      return { ...base, orderPaymentStatus: "PAID" };
    }

    if (result.status === "PAID") {
      // Protección contra manipulación del monto.
      if (result.amountPaid === null || result.amountPaid < order.grandTotal) {
        await upsertPayment(tx, order.id, result, "REJECTED", rawPayload);
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            toStatus: order.status,
            note:
              result.amountPaid === null
                ? "Pago rechazado: el proveedor no informó un monto verificable."
                : `Pago rechazado: monto ${result.amountPaid} < total ${order.grandTotal}.`,
          },
        });
        return { ...base, orderPaymentStatus: order.paymentStatus };
      }

      const heldReservations = await tx.stockReservation.count({
        where: { orderId: order.id, status: "HELD" },
      });
      let stockWarning: string | null = null;

      // Mercado Pago puede confirmar después de que venció la reserva. En ese
      // caso intentamos reservar nuevamente de forma atómica antes de consumir.
      // Si ya no queda stock, el dinero igualmente fue cobrado: nunca ocultamos
      // ese hecho ni reembolsamos automáticamente; dejamos una alerta crítica
      // para resolución manual desde el panel.
      if (heldReservations === 0) {
        const lines = new Map<
          string,
          { variantId: string; quantity: number; productName: string }
        >();
        for (const item of order.items) {
          if (!item.variantId) {
            stockWarning =
              "PAGO APROBADO SIN RESERVA: una variante del pedido ya no existe. Revisión manual obligatoria.";
            break;
          }
          const current = lines.get(item.variantId);
          lines.set(item.variantId, {
            variantId: item.variantId,
            quantity: (current?.quantity ?? 0) + item.quantity,
            productName: item.productName,
          });
        }
        if (!stockWarning) {
          try {
            await reserveStock(tx, order.id, [...lines.values()]);
          } catch (error) {
            if (!(error instanceof OutOfStockError)) throw error;
            stockWarning = `PAGO APROBADO SIN STOCK: ${error.message} El cobro existe y requiere resolución manual; no se realizó reembolso automático.`;
          }
        }
      }

      if (!stockWarning) await consumeReservations(tx, order.id);
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: order.status === "PENDING_PAYMENT" ? "PAID" : order.status,
          paidAt: new Date(),
          ...(stockWarning
            ? {
                internalNotes: [order.internalNotes, stockWarning]
                  .filter(Boolean)
                  .join("\n"),
              }
            : {}),
        },
      });
      await upsertPayment(tx, order.id, result, "PAID", rawPayload);
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "PAID",
          note: stockWarning
            ? `${stockWarning} (${result.provider} ${result.providerReference}).`
            : `Pago aprobado (${result.provider} ${result.providerReference}).`,
        },
      });
      // El modelo de emisión declarado por TG LAB usa el comprobante del
      // pago electrónico como boleta. No se crea una boleta SII adicional,
      // porque duplicaría tributariamente la venta. Las transferencias sí
      // crean un DocumentRecord pendiente en confirmBankTransfer().
      return { ...base, orderPaymentStatus: "PAID", transitionedToPaid: true };
    }

    if (result.status === "REJECTED" || result.status === "CANCELLED") {
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
