"use server";

import { z } from "zod";

import type { ActionResult } from "@/server/auth/action-guard";
import { getCartToken } from "@/server/services/cart-service";
import { quoteCart, type Quote } from "@/server/services/pricing-service";

const quoteSchema = z.object({
  fulfillmentMethod: z.enum(["SHIPPING", "PICKUP"]),
  region: z.string().max(80).optional(),
  comuna: z.string().max(80).optional(),
  shippingRateId: z.string().cuid().optional(),
  couponCode: z.string().max(40).optional(),
  customerEmail: z.string().email().max(160).optional().or(z.literal("")),
});

/**
 * Cotización en vivo para el checkout (solo lectura, no crea nada).
 * El mismo cálculo se repite —de forma autoritativa— al crear el pedido.
 */
export async function quoteCheckout(
  input: z.infer<typeof quoteSchema>,
): Promise<ActionResult<Quote>> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Parámetros inválidos." };
  }
  const cartToken = await getCartToken();
  if (!cartToken) {
    return { ok: false, error: "Tu carrito está vacío." };
  }
  const quote = await quoteCart({
    cartToken,
    ...parsed.data,
    customerEmail: parsed.data.customerEmail || undefined,
  });
  return { ok: true, data: quote };
}
