"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";

import { ActionError, staffAction } from "@/server/auth/action-guard";
import type { ActionResult } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { consumeReservations } from "@/server/services/inventory-service";
import { MercadoPagoProvider } from "@/server/payments/mercadopago";
import { applyProviderPayment } from "@/server/payments/payment-service";
import { getProvider } from "@/server/payments/registry";
import type { StartPaymentResult } from "@/server/payments/types";

const startSchema = z.object({
  orderNumber: z.string().max(20),
  method: z.enum(["MERCADOPAGO", "WEBPAY", "FLOW", "BANK_TRANSFER"]),
});

/**
 * Inicia el pago de un pedido pendiente. Crea (o reutiliza) un registro
 * `Payment` y delega en el proveedor. NUNCA marca el pedido como pagado aquí.
 */
export async function startPayment(
  input: z.infer<typeof startSchema>,
): Promise<ActionResult<StartPaymentResult>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { orderNumber, method } = parsed.data;

  const provider = getProvider(method);
  if (!provider || !provider.isConfigured()) {
    return { ok: false, error: "Método de pago no disponible." };
  }

  const order = await db.order.findUnique({
    where: { number: orderNumber.toUpperCase().trim() },
    select: {
      id: true,
      number: true,
      grandTotal: true,
      email: true,
      paymentStatus: true,
      expiresAt: true,
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "Este pedido ya está pagado." };
  }
  if (order.expiresAt && order.expiresAt < new Date()) {
    return {
      ok: false,
      error: "La reserva de este pedido venció. Vuelve a armar tu carrito.",
    };
  }

  try {
    const result = await provider.start(order);
    if (result.kind === "unavailable") {
      return { ok: false, error: result.reason };
    }

    // Registra el intento de pago (idempotente por proveerReference).
    await db.payment.upsert({
      where: {
        provider_providerReference: {
          provider: method,
          providerReference: result.providerReference,
        },
      },
      create: {
        orderId: order.id,
        provider: method,
        providerReference: result.providerReference,
        status: result.kind === "redirect" ? "PENDING" : "INITIATED",
        amount: order.grandTotal,
        idempotencyKey: nanoid(24),
      },
      update: { status: result.kind === "redirect" ? "PENDING" : "INITIATED" },
    });

    return { ok: true, data: result };
  } catch (err) {
    console.error("[startPayment]", err);
    return { ok: false, error: "No se pudo iniciar el pago." };
  }
}

const syncSchema = z.object({
  orderNumber: z.string().max(20),
  paymentId: z.string().max(40).optional(),
});

/**
 * Al volver del checkout de Mercado Pago consultamos el pago en la API de MP
 * (no confiamos en los parámetros de la URL) y aplicamos el resultado.
 * Idempotente: si el webhook ya lo procesó, no hace nada.
 */
export async function syncMercadoPagoReturn(
  input: z.infer<typeof syncSchema>,
): Promise<ActionResult<{ paymentStatus: string }>> {
  const parsed = syncSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const provider = new MercadoPagoProvider();
  if (!provider.isConfigured() || !parsed.data.paymentId) {
    const order = await db.order.findUnique({
      where: { number: parsed.data.orderNumber.toUpperCase().trim() },
      select: { paymentStatus: true },
    });
    return {
      ok: true,
      data: { paymentStatus: order?.paymentStatus ?? "PENDING" },
    };
  }

  const result = await provider.fetchPayment(parsed.data.paymentId);
  if (!result || result.orderNumber !== parsed.data.orderNumber) {
    return { ok: true, data: { paymentStatus: "PENDING" } };
  }
  const applied = await applyProviderPayment(result);
  revalidatePath(`/checkout/pago/${parsed.data.orderNumber}`);
  return { ok: true, data: { paymentStatus: applied.orderPaymentStatus } };
}

const confirmSchema = z.object({
  orderNumber: z.string().max(20),
  reference: z.string().trim().max(120).optional(),
});

/**
 * ADMIN: confirma manualmente el pago (transferencia bancaria recibida).
 * Aquí SÍ se descuenta el stock definitivamente (consume las reservas).
 * Es idempotente: si ya está pagado, no hace nada.
 */
export async function confirmBankTransfer(
  input: z.infer<typeof confirmSchema>,
) {
  return staffAction(async (session) => {
    const { orderNumber, reference } = confirmSchema.parse(input);

    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number: orderNumber.toUpperCase().trim() },
      });
      if (!order) throw new ActionError("Pedido no encontrado.");
      if (order.paymentStatus === "PAID") return;

      await consumeReservations(tx, order.id);

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: order.status === "PENDING_PAYMENT" ? "PAID" : order.status,
          paidAt: new Date(),
        },
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "BANK_TRANSFER",
          providerReference: reference || `MANUAL-${nanoid(10)}`,
          status: "PAID",
          amount: order.grandTotal,
          amountPaid: order.grandTotal,
          idempotencyKey: nanoid(24),
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "PAID",
          note: `Pago por transferencia confirmado${reference ? ` (ref: ${reference})` : ""}.`,
          adminUserId: session.user.id,
        },
      });
      await tx.documentRecord.create({
        data: { orderId: order.id, type: "BOLETA", status: "PENDING" },
      });
    });

    revalidatePath("/admin/pedidos");
    return null;
  });
}
