"use client";

/**
 * Disparadores de eventos de e-commerce para GA4 y Meta Pixel.
 * No hacen nada si los scripts no están cargados (IDs sin configurar).
 * El evento `purchase` se protege contra duplicados con sessionStorage.
 */

type Item = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  variant?: string | null;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function ga(event: string, params: Record<string, unknown>) {
  window.gtag?.("event", event, params);
}
function pixel(event: string, params: Record<string, unknown>) {
  window.fbq?.("track", event, params);
}

const CURRENCY = "CLP";

export function trackViewItem(item: Item) {
  ga("view_item", {
    currency: CURRENCY,
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  });
  pixel("ViewContent", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price,
    currency: CURRENCY,
  });
}

export function trackAddToCart(item: Item) {
  const qty = item.quantity ?? 1;
  ga("add_to_cart", {
    currency: CURRENCY,
    value: item.price * qty,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: qty,
        item_variant: item.variant ?? undefined,
      },
    ],
  });
  pixel("AddToCart", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price * qty,
    currency: CURRENCY,
  });
}

export function trackRemoveFromCart(item: Item) {
  ga("remove_from_cart", {
    currency: CURRENCY,
    value: item.price * (item.quantity ?? 1),
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  });
}

export function trackViewCart(value: number, items: Item[]) {
  ga("view_cart", {
    currency: CURRENCY,
    value,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity ?? 1,
    })),
  });
}

export function trackBeginCheckout(value: number, items: Item[]) {
  ga("begin_checkout", {
    currency: CURRENCY,
    value,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity ?? 1,
    })),
  });
  pixel("InitiateCheckout", { value, currency: CURRENCY });
}

/** `purchase` se dispara UNA sola vez por pedido (guardado en sessionStorage). */
export function trackPurchase(order: {
  number: string;
  value: number;
  shipping: number;
  items: Item[];
}) {
  const key = `tglab_purchase_${order.number}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* si no hay sessionStorage, se permite (poco probable duplicar) */
  }
  ga("purchase", {
    transaction_id: order.number,
    currency: CURRENCY,
    value: order.value,
    shipping: order.shipping,
    items: order.items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity ?? 1,
    })),
  });
  pixel("Purchase", { value: order.value, currency: CURRENCY });
}
