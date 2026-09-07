import "server-only";

import { STOCK_RESERVATION_TTL_MINUTES } from "@/config/constants";
import type { InventoryMovementType, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type Tx = Prisma.TransactionClient;

/**
 * Servicio de inventario.
 *
 * Modelo de disponibilidad: `disponible = stock - reservedStock`.
 *  - Al confirmar el checkout se RESERVA stock (sube `reservedStock`, se crea
 *    una `StockReservation` con vencimiento). El `stock` NO baja todavía.
 *  - Pago aprobado  -> `consumeReservations`: baja `stock` y `reservedStock`,
 *    registra movimiento SALE.
 *  - Pago fallido / vencimiento -> `releaseReservations`: baja `reservedStock`,
 *    registra movimiento RELEASE.
 */

export async function recordMovement(
  client: Tx | typeof db,
  input: {
    variantId: string;
    type: InventoryMovementType;
    /** Delta aplicado (negativo = baja de stock). */
    quantityDelta: number;
    stockBefore: number;
    stockAfter: number;
    reason?: string;
    orderId?: string;
    adminUserId?: string;
  },
) {
  return client.inventoryMovement.create({
    data: {
      variantId: input.variantId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      stockBefore: input.stockBefore,
      stockAfter: input.stockAfter,
      reason: input.reason ?? null,
      orderId: input.orderId ?? null,
      adminUserId: input.adminUserId ?? null,
    },
  });
}

/**
 * Ajusta el stock de una variante a un valor absoluto y deja registro.
 * Devuelve `true` si hubo cambio.
 */
export async function setStock(
  variantId: string,
  newStock: number,
  opts: { reason?: string; adminUserId?: string; type?: InventoryMovementType },
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });
    if (!variant) throw new Error(`Variante ${variantId} no encontrada`);
    if (variant.stock === newStock) return false;

    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    });
    await recordMovement(tx, {
      variantId,
      type: opts.type ?? (newStock > variant.stock ? "RESTOCK" : "ADJUSTMENT"),
      quantityDelta: newStock - variant.stock,
      stockBefore: variant.stock,
      stockAfter: newStock,
      reason: opts.reason,
      adminUserId: opts.adminUserId,
    });
    return true;
  });
}

export async function listMovements(variantId: string, take = 50) {
  return db.inventoryMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take,
    include: { adminUser: { select: { name: true } } },
  });
}

// ---------------------------------------------------------------------------
//  Reservas de stock (checkout)
// ---------------------------------------------------------------------------

export class OutOfStockError extends Error {
  constructor(public readonly productName: string) {
    super(`Sin stock suficiente para "${productName}".`);
    this.name = "OutOfStockError";
  }
}

/**
 * Reserva stock para las líneas de un pedido dentro de una transacción.
 * Usa un UPDATE condicional para evitar sobreventa bajo concurrencia:
 * solo incrementa `reservedStock` si `stock - reservedStock >= quantity`.
 * Lanza `OutOfStockError` si alguna línea no alcanza (revierte la transacción).
 */
export async function reserveStock(
  tx: Tx,
  orderId: string,
  lines: { variantId: string; quantity: number; productName: string }[],
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + STOCK_RESERVATION_TTL_MINUTES * 60 * 1000,
  );

  for (const line of lines) {
    // UPDATE atómico: solo reserva si queda stock libre suficiente.
    const affected = await tx.$executeRaw`
      UPDATE "product_variant"
      SET "reservedStock" = "reservedStock" + ${line.quantity}
      WHERE "id" = ${line.variantId}
        AND "stock" - "reservedStock" >= ${line.quantity}
    `;
    if (affected === 0) {
      throw new OutOfStockError(line.productName);
    }
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: line.variantId },
      select: { stock: true, reservedStock: true },
    });

    await tx.stockReservation.create({
      data: {
        orderId,
        variantId: line.variantId,
        quantity: line.quantity,
        expiresAt,
        status: "HELD",
      },
    });
    await recordMovement(tx, {
      variantId: line.variantId,
      type: "RESERVATION",
      quantityDelta: -line.quantity,
      stockBefore: variant.stock,
      stockAfter: variant.stock, // el stock real no cambia todavía
      reason: "Reserva de checkout",
      orderId,
    });
  }
}

/**
 * Convierte las reservas HELD de un pedido en venta definitiva: baja `stock` y
 * `reservedStock`, registra SALE. Idempotente (si ya están CONSUMED, no hace
 * nada). Devuelve las variantes que quedaron con stock <= 0.
 */
export async function consumeReservations(
  tx: Tx,
  orderId: string,
): Promise<void> {
  const reservations = await tx.stockReservation.findMany({
    where: { orderId, status: "HELD" },
  });
  for (const r of reservations) {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: r.variantId },
      select: { stock: true, reservedStock: true },
    });
    const newStock = Math.max(0, variant.stock - r.quantity);
    await tx.productVariant.update({
      where: { id: r.variantId },
      data: {
        stock: newStock,
        reservedStock: Math.max(0, variant.reservedStock - r.quantity),
      },
    });
    await tx.stockReservation.update({
      where: { id: r.id },
      data: { status: "CONSUMED", resolvedAt: new Date() },
    });
    await recordMovement(tx, {
      variantId: r.variantId,
      type: "SALE",
      quantityDelta: -r.quantity,
      stockBefore: variant.stock,
      stockAfter: newStock,
      reason: "Venta confirmada",
      orderId,
    });
  }
}

/** Libera las reservas HELD de un pedido (pago fallido / cancelado / vencido). */
export async function releaseReservations(
  client: Tx | typeof db,
  orderId: string,
  reason = "Reserva liberada",
): Promise<void> {
  const reservations = await client.stockReservation.findMany({
    where: { orderId, status: "HELD" },
  });
  for (const r of reservations) {
    const variant = await client.productVariant.findUniqueOrThrow({
      where: { id: r.variantId },
      select: { stock: true, reservedStock: true },
    });
    await client.productVariant.update({
      where: { id: r.variantId },
      data: { reservedStock: Math.max(0, variant.reservedStock - r.quantity) },
    });
    await client.stockReservation.update({
      where: { id: r.id },
      data: { status: "RELEASED", resolvedAt: new Date() },
    });
    await recordMovement(client, {
      variantId: r.variantId,
      type: "RELEASE",
      quantityDelta: r.quantity,
      stockBefore: variant.stock,
      stockAfter: variant.stock,
      reason,
      orderId,
    });
  }
}

/**
 * Libera reservas vencidas y marca los pedidos asociados como EXPIRED.
 * Se llama de forma perezosa (checkout / disponibilidad) y, más adelante,
 * desde un cron.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await db.stockReservation.findMany({
    where: { status: "HELD", expiresAt: { lt: new Date() } },
    select: { orderId: true },
    distinct: ["orderId"],
    take: 100,
  });
  if (expired.length === 0) return 0;

  for (const { orderId } of expired) {
    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.paymentStatus === "PAID") return;
      await releaseReservations(
        tx,
        orderId,
        "Vencimiento de la ventana de pago",
      );
      if (order.paymentStatus === "PENDING") {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: "EXPIRED", status: "CANCELLED" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: "CANCELLED",
            note: "Pago no completado dentro del plazo.",
          },
        });
      }
    });
  }
  return expired.length;
}
