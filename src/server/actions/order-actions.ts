"use server";

import { revalidatePath } from "next/cache";

import { checkoutSchema, type CheckoutInput } from "@/lib/schemas/checkout";
import { normalizeRut } from "@/lib/rut";
import type { ActionResult } from "@/server/auth/action-guard";
import { ActionError } from "@/server/auth/action-guard";
import { db } from "@/server/db";
import { getCartToken } from "@/server/services/cart-service";
import {
  OutOfStockError,
  releaseExpiredReservations,
  reserveStock,
} from "@/server/services/inventory-service";
import { recordCouponUse } from "@/server/services/coupon-service";
import { nextOrderNumber } from "@/server/services/order-service";
import { quoteCart } from "@/server/services/pricing-service";

type CreateOrderResult = { orderNumber: string; orderId: string };

/**
 * Crea un pedido a partir del carrito.
 *
 * Garantías:
 *  - checkout de invitado (no requiere cuenta)
 *  - TODOS los montos se recalculan aquí desde la BD (no se confía en el cliente)
 *  - el stock NO se descuenta: se RESERVA (StockReservation con vencimiento).
 *    El descuento definitivo ocurre al confirmarse el pago (Fase 8)
 *  - idempotente por `idempotencyKey`: doble clic / reintentos devuelven el
 *    mismo pedido en lugar de crear otro
 *  - `status` (pedido) y `paymentStatus` (pago) son campos separados
 */
export async function createOrder(
  input: CheckoutInput,
): Promise<ActionResult<CreateOrderResult>> {
  let data: CheckoutInput;
  try {
    data = checkoutSchema.parse(input);
  } catch {
    return { ok: false, error: "Revisa los datos del formulario." };
  }

  try {
    // 1. Idempotencia: si esta clave ya creó un pedido, devuélvelo.
    const existing = await db.order.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      select: { id: true, number: true },
    });
    if (existing) {
      return {
        ok: true,
        data: { orderNumber: existing.number, orderId: existing.id },
      };
    }

    await releaseExpiredReservations();

    const cartToken = await getCartToken();
    if (!cartToken) {
      throw new ActionError("Tu carrito está vacío.");
    }

    // 2. Cotización autoritativa (server-side).
    const quote = await quoteCart({
      cartToken,
      fulfillmentMethod: data.fulfillmentMethod,
      region: data.region,
      comuna: data.comuna,
      shippingRateId: data.shippingRateId,
      couponCode: data.couponCode,
      customerEmail: data.email,
    });

    if (quote.isEmpty) {
      throw new ActionError("Tu carrito no tiene productos disponibles.");
    }
    if (quote.hasUnavailableLines) {
      throw new ActionError(
        "Algunos productos del carrito ya no tienen stock. Ajusta el carrito.",
      );
    }
    if (data.fulfillmentMethod === "SHIPPING" && !quote.selectedShipping) {
      throw new ActionError(
        "No hay despacho disponible para esa dirección. Prueba con retiro.",
      );
    }

    const rut = normalizeRut(data.rut);
    const payableLines = quote.lines.filter((l) => l.available);

    const coupon = quote.appliedCoupon
      ? await db.coupon.findUnique({
          where: { code: quote.appliedCoupon.code },
          select: { id: true },
        })
      : null;

    // 3. Transacción: reserva de stock + creación del pedido.
    const order = await db.$transaction(async (tx) => {
      // Cliente invitado: se registra el mínimo para asociar pedidos/boleta.
      const customer = await tx.customer.upsert({
        where: { email: data.email.toLowerCase() },
        create: {
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          rut,
        },
        update: { phone: data.phone, rut },
      });

      const number = await nextOrderNumber(tx);

      const shippingAddress =
        data.fulfillmentMethod === "SHIPPING"
          ? {
              region: data.region,
              comuna: data.comuna,
              street: data.street,
              number: data.number,
              apartment: data.apartment ?? null,
              postalCode: data.postalCode ?? null,
              notes: data.addressNotes ?? null,
            }
          : undefined;

      const created = await tx.order.create({
        data: {
          number,
          idempotencyKey: data.idempotencyKey,
          customerId: customer.id,
          email: data.email.toLowerCase(),
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          rut,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          fulfillmentMethod: data.fulfillmentMethod,
          shippingAddress: shippingAddress
            ? (shippingAddress as object)
            : undefined,
          region: data.region ?? null,
          comuna: data.comuna ?? null,
          shippingRateId: quote.selectedShipping?.rateId ?? null,
          shippingRateName: quote.selectedShipping
            ? `${quote.selectedShipping.zoneName} — ${quote.selectedShipping.name}`
            : null,
          currency: "CLP",
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          shippingTotal: quote.shippingTotal,
          grandTotal: quote.grandTotal,
          couponId: coupon?.id ?? null,
          couponCode: quote.appliedCoupon?.code ?? null,
          customerNote: data.customerNote ?? null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: {
            create: payableLines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productName: line.productName,
              variantLabel: line.variantLabel,
              sku: line.sku,
              imageUrl: line.imageUrl,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineDiscount: 0,
              lineTotal: line.lineTotal,
              customizations: {
                create: line.customizations.map((c) => ({
                  key: c.key,
                  label: c.label,
                  value: c.value,
                })),
              },
            })),
          },
          statusHistory: {
            create: { toStatus: "PENDING_PAYMENT", note: "Pedido creado" },
          },
        },
      });

      // Reserva de stock (revierte toda la transacción si falta).
      await reserveStock(
        tx,
        created.id,
        payableLines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          productName: l.productName,
        })),
      );

      if (coupon && quote.appliedCoupon) {
        await recordCouponUse(tx, {
          couponId: coupon.id,
          orderId: created.id,
          customerEmail: data.email,
          amountDiscounted: quote.appliedCoupon.discount,
        });
      }

      // Vacía el carrito: el pedido ya guarda el snapshot.
      await tx.cartItem.deleteMany({ where: { cart: { token: cartToken } } });

      return created;
    });

    revalidatePath("/", "layout");

    const { sendOrderReceivedEmail } =
      await import("@/server/email/order-emails");
    await sendOrderReceivedEmail(order.id);

    return {
      ok: true,
      data: { orderNumber: order.number, orderId: order.id },
    };
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof ActionError) {
      return { ok: false, error: err.message };
    }
    // Carrera con la misma clave de idempotencia: devuelve el pedido ya creado.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      const dup = await db.order.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { id: true, number: true },
      });
      if (dup) {
        return {
          ok: true,
          data: { orderNumber: dup.number, orderId: dup.id },
        };
      }
    }
    console.error("[createOrder]", err);
    return {
      ok: false,
      error: "No se pudo crear el pedido. Intenta nuevamente.",
    };
  }
}
