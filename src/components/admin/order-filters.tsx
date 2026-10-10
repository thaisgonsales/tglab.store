"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  labelFor,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-labels";

const ORDER_STATUS = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const PAYMENT_STATUS = [
  "PENDING",
  "PAID",
  "REJECTED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
];

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function setParam(updates: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
      <form
        className="sm:col-span-2 lg:flex-1 lg:basis-56"
        onSubmit={(e) => {
          e.preventDefault();
          setParam({ q });
        }}
      >
        <Input
          placeholder="Buscar por número, email o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <Select
        className="w-full lg:max-w-[11rem]"
        value={params.get("estado") ?? ""}
        onChange={(e) => setParam({ estado: e.target.value })}
      >
        <option value="">Estado del pedido</option>
        {ORDER_STATUS.map((s) => (
          <option key={s} value={s}>
            {labelFor(ORDER_STATUS_LABELS, s)}
          </option>
        ))}
      </Select>
      <Select
        className="w-full lg:max-w-[11rem]"
        value={params.get("pago") ?? ""}
        onChange={(e) => setParam({ pago: e.target.value })}
      >
        <option value="">Estado del pago</option>
        {PAYMENT_STATUS.map((s) => (
          <option key={s} value={s}>
            {labelFor(PAYMENT_STATUS_LABELS, s)}
          </option>
        ))}
      </Select>
      <Select
        className="w-full sm:col-span-2 lg:max-w-[9rem]"
        value={params.get("entrega") ?? ""}
        onChange={(e) => setParam({ entrega: e.target.value })}
      >
        <option value="">Entrega</option>
        <option value="SHIPPING">Despacho</option>
        <option value="PICKUP">Retiro</option>
      </Select>
    </div>
  );
}
