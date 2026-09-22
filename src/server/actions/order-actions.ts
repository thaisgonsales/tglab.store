"use server";

import { headers } from "next/headers";

import { rateLimit } from "@/lib/rate-limit";
import type { CheckoutInput } from "@/lib/schemas/checkout";
import { createOrder as createCheckoutOrder } from "@/server/services/checkout-order-service";

export async function createOrder(input: CheckoutInput) {
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const limit = rateLimit(`checkout:${ip}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return {
      ok: false as const,
      error: "Demasiados intentos de compra. Espera antes de continuar.",
    };
  }
  return createCheckoutOrder(input);
}
