"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { formatDateTime } from "@/lib/datetime";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/auth/action-guard";
import { getOrderForTracking } from "@/server/services/order-service";

const lookupSchema = z.object({
  number: z.string().trim().min(3).max(24),
  email: z.string().trim().email(),
});

export type TrackingStep = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
  at: string | null;
};

export type TrackingView = {
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentMethod: "SHIPPING" | "PICKUP";
  placedAt: string;
  grandTotal: number;
  items: { name: string; variant: string | null; quantity: number }[];
  steps: TrackingStep[];
  tracking: {
    carrier: string | null;
    number: string | null;
    url: string | null;
  };
  history: { at: string; label: string; note: string | null }[];
  needsPayment: boolean;
};

const FLOW_SHIPPING = [
  { key: "received", label: "Pedido recibido", statuses: ["PENDING_PAYMENT"] },
  { key: "paid", label: "Pago confirmado", statuses: ["PAID"] },
  { key: "preparing", label: "En preparación", statuses: ["PREPARING"] },
  { key: "shipped", label: "Enviado", statuses: ["SHIPPED"] },
  { key: "delivered", label: "Entregado", statuses: ["DELIVERED"] },
];
const FLOW_PICKUP = [
  { key: "received", label: "Pedido recibido", statuses: ["PENDING_PAYMENT"] },
  { key: "paid", label: "Pago confirmado", statuses: ["PAID"] },
  { key: "preparing", label: "En preparación", statuses: ["PREPARING"] },
  { key: "ready", label: "Listo para retiro", statuses: ["READY_FOR_PICKUP"] },
  { key: "delivered", label: "Entregado", statuses: ["DELIVERED"] },
];

const STATUS_RANK: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PREPARING: 2,
  READY_FOR_PICKUP: 3,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  PREPARING: "En preparación",
  READY_FOR_PICKUP: "Listo para retiro",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export async function lookupOrderTracking(
  input: z.infer<typeof lookupSchema>,
): Promise<ActionResult<TrackingView | null>> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ingresa el número de pedido y tu email." };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const limit = rateLimit(`tracking:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera unos minutos antes de continuar.",
    };
  }

  const order = await getOrderForTracking(
    parsed.data.number,
    parsed.data.email,
  );
  if (!order) {
    return {
      ok: false,
      error: "No encontramos un pedido con ese número y email.",
    };
  }

  const cancelled = order.status === "CANCELLED";
  const rank = STATUS_RANK[order.status] ?? 0;
  const flow =
    order.fulfillmentMethod === "PICKUP" ? FLOW_PICKUP : FLOW_SHIPPING;

  const historyByStatus = new Map<string, Date>();
  for (const h of order.statusHistory) {
    if (!historyByStatus.has(h.toStatus)) {
      historyByStatus.set(h.toStatus, h.createdAt);
    }
  }

  const steps: TrackingStep[] = flow.map((step, i) => {
    const stepRank = i;
    const at = step.statuses.map((s) => historyByStatus.get(s)).find(Boolean);
    return {
      key: step.key,
      label: step.label,
      done: !cancelled && rank > stepRank,
      current: !cancelled && rank === stepRank,
      at: at ? formatDateTime(at) : null,
    };
  });

  return {
    ok: true,
    data: {
      number: order.number,
      status: STATUS_LABEL[order.status] ?? order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentMethod: order.fulfillmentMethod,
      placedAt: formatDateTime(order.placedAt),
      grandTotal: order.grandTotal,
      items: order.items.map((it) => ({
        name: it.productName,
        variant: it.variantLabel,
        quantity: it.quantity,
      })),
      steps,
      tracking: {
        carrier: order.carrier,
        number: order.trackingNumber,
        url: order.trackingUrl,
      },
      history: order.statusHistory.map((h) => ({
        at: formatDateTime(h.createdAt),
        label: STATUS_LABEL[h.toStatus] ?? h.toStatus,
        note: h.note,
      })),
      needsPayment:
        order.paymentStatus === "PENDING" && order.status === "PENDING_PAYMENT",
    },
  };
}
