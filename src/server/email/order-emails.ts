import "server-only";

import { render } from "@react-email/components";

import { publicEnv } from "@/lib/env";
import {
  OrderEmail,
  type OrderEmailData,
  type OrderEmailKind,
} from "@/emails/order-email";
import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email/send";
import { getSettingsGroup } from "@/server/services/settings-service";

const SUBJECTS: Record<OrderEmailKind, string> = {
  received: "Recibimos tu pedido",
  paid: "Pago confirmado",
  preparing: "Estamos preparando tu pedido",
  ready_for_pickup: "Tu pedido está listo para retiro",
  shipped: "Tu pedido va en camino",
  delivered: "Tu pedido fue entregado",
  cancelled: "Tu pedido fue cancelado",
};

const STATUS_TO_KIND: Partial<Record<OrderStatus, OrderEmailKind>> = {
  PAID: "paid",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

async function buildAndSend(
  orderId: string,
  kind: OrderEmailKind,
  extra: { cancellationReason?: string } = {},
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { id: null, provider: "none" as const };

  const [brand, contact, commerce] = await Promise.all([
    getSettingsGroup("brand"),
    getSettingsGroup("contact"),
    getSettingsGroup("commerce"),
  ]);

  const addr = order.shippingAddress as Record<string, string> | null;
  const shippingAddress = addr
    ? `${addr.street ?? ""} ${addr.number ?? ""}${addr.apartment ? `, ${addr.apartment}` : ""}, ${addr.comuna ?? ""}, ${addr.region ?? ""}`.trim()
    : null;

  const data: OrderEmailData = {
    kind,
    storeName: brand.storeName,
    number: order.number,
    firstName: order.firstName,
    items: order.items.map((it) => ({
      name: it.productName,
      variant: it.variantLabel,
      quantity: it.quantity,
      total: it.lineTotal,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    grandTotal: order.grandTotal,
    fulfillmentMethod: order.fulfillmentMethod,
    shippingAddress,
    pickupInfo: contact.addressPublic || commerce.pickupInstructions || null,
    trackingCarrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    trackingPageUrl: `${publicEnv.siteUrl}/pedido?numero=${order.number}`,
    bankInstructions:
      kind === "received" && order.paymentStatus === "PENDING"
        ? commerce.bankTransferInstructions ||
          "Te enviaremos los datos para el pago o puedes completarlo desde la página del pedido."
        : null,
    cancellationReason: extra.cancellationReason ?? null,
  };

  const html = await render(OrderEmail(data));
  const text = await render(OrderEmail(data), { plainText: true });

  return sendEmail({
    to: order.email,
    subject: `${SUBJECTS[kind]} · Pedido ${order.number}`,
    html,
    text,
  });
}

export function sendOrderReceivedEmail(orderId: string) {
  return buildAndSend(orderId, "received");
}

export function sendPaymentConfirmedEmail(orderId: string) {
  return buildAndSend(orderId, "paid");
}

export function sendOrderStatusEmail(
  orderId: string,
  status: OrderStatus,
  opts: { cancellationReason?: string } = {},
) {
  const kind = STATUS_TO_KIND[status];
  if (!kind) return Promise.resolve({ id: null, provider: "none" as const });
  return buildAndSend(orderId, kind, opts);
}
