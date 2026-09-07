"use client";

import { useEffect } from "react";

import { trackPurchase } from "@/lib/analytics";

/** Dispara el evento `purchase` una sola vez cuando el pedido está pagado. */
export function PurchaseTracker({
  number,
  value,
  shipping,
  items,
}: {
  number: string;
  value: number;
  shipping: number;
  items: { id: string; name: string; price: number; quantity: number }[];
}) {
  useEffect(() => {
    trackPurchase({ number, value, shipping, items });
  }, [number, value, shipping, items]);

  return null;
}
