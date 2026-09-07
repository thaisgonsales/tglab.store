import "server-only";

import { cookies } from "next/headers";

import { CART_COOKIE_NAME } from "@/config/constants";
import { db } from "@/server/db";

/**
 * Servicio de carrito — implementación mínima para la Fase 0.
 * La lógica completa (agregar/quitar líneas, recálculo de precios, persistencia
 * y fusión de carritos) se construye en la Fase 6.
 */

/** Devuelve la cantidad total de unidades en el carrito actual (0 si no hay). */
export async function getCartItemCount(): Promise<number> {
  try {
    const token = (await cookies()).get(CART_COOKIE_NAME)?.value;
    if (!token) return 0;
    const result = await db.cartItem.aggregate({
      where: { cart: { token } },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  } catch {
    return 0;
  }
}
