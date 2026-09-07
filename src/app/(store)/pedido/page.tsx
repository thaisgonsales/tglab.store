import type { Metadata } from "next";

import { OrderTracking } from "@/components/store/order-tracking";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  robots: { index: false, follow: false },
};

export default async function OrderTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string }>;
}) {
  const { numero } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Seguir mi pedido
      </h1>
      <p className="text-foreground-muted mt-2 text-sm">
        Ingresa el número de pedido (TG-XXXXXX) y el email con el que compraste.
      </p>
      <div className="mt-6">
        <OrderTracking defaultNumber={numero} />
      </div>
    </div>
  );
}
