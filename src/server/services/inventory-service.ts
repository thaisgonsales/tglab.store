import "server-only";

import type { InventoryMovementType, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type Tx = Prisma.TransactionClient;

/**
 * Servicio de inventario.
 * En la Fase 3 se usa para ajustes manuales desde el panel; la reserva/venta
 * transaccional durante el checkout se implementa en las Fases 6–8.
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
