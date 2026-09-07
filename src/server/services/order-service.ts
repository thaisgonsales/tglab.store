import "server-only";

import { ORDER_NUMBER_PAD, ORDER_NUMBER_PREFIX } from "@/config/constants";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

/**
 * Genera el siguiente número de pedido usando una secuencia de PostgreSQL
 * (creada en la migración `orders_and_reservations`). Es atómico y sin huecos
 * de condición de carrera.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('order_number_seq') AS nextval
  `;
  const n = Number(rows[0]?.nextval ?? 0);
  return `${ORDER_NUMBER_PREFIX}${String(n).padStart(ORDER_NUMBER_PAD, "0")}`;
}

const orderDetailInclude = {
  items: { include: { customizations: true } },
  payments: { orderBy: { createdAt: "desc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  documents: true,
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{
  include: typeof orderDetailInclude;
}>;

export async function getOrderByNumber(
  numberInput: string,
): Promise<OrderDetail | null> {
  return db.order.findUnique({
    where: { number: numberInput.toUpperCase().trim() },
    include: orderDetailInclude,
  });
}

/** Consulta pública: número + email deben coincidir. */
export async function getOrderForTracking(
  numberInput: string,
  email: string,
): Promise<OrderDetail | null> {
  const order = await getOrderByNumber(numberInput);
  if (!order) return null;
  if (order.email.toLowerCase() !== email.toLowerCase().trim()) return null;
  return order;
}
