"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { releaseReservations } from "@/server/services/inventory-service";

const STATUS_FLOW: Record<string, string[]> = {
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

    if (
      toStatus !== order.status &&
      !STATUS_FLOW[order.status]?.includes(toStatus)
    ) {
      throw new ActionError(
        `No se puede pasar de "${order.status}" a "${toStatus}".`,
      );
    }

    await db.$transaction(async (tx) => {
      // Cancelar un pedido no pagado libera la reserva de stock.
      if (toStatus === "CANCELLED" && order.paymentStatus !== "PAID") {
        await releaseReservations(
          tx,
          orderId,
          "Pedido cancelado por el equipo",
        );
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          ...(toStatus === "CANCELLED" && order.paymentStatus !== "PAID"
            ? { paymentStatus: "CANCELLED" }
            : {}),
        },
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

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return null;
  });
}

const trackingSchema = z.object({
  orderId: z.string().cuid(),
  carrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(2000).optional(),
});

export async function updateOrderTracking(
  input: z.infer<typeof trackingSchema>,
) {
  return staffAction(async () => {
    const data = trackingSchema.parse(input);
    await db.order.update({
      where: { id: data.orderId },
      data: {
        carrier: data.carrier || null,
        trackingNumber: data.trackingNumber || null,
        trackingUrl: data.trackingUrl || null,
        internalNotes: data.internalNotes || null,
      },
    });
    revalidatePath(`/admin/pedidos/${data.orderId}`);
    return null;
  });
}
