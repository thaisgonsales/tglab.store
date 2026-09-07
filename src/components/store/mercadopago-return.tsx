"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { syncMercadoPagoReturn } from "@/server/actions/payment-actions";

/**
 * Al volver de Mercado Pago, confirma el estado real del pago contra la API
 * (no contra los parámetros de la URL) y refresca la página.
 */
export function MercadoPagoReturn({
  orderNumber,
  paymentId,
}: {
  orderNumber: string;
  paymentId?: string;
}) {
  const router = useRouter();
  const done = useRef(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void (async () => {
      await syncMercadoPagoReturn({ orderNumber, paymentId });
      setChecking(false);
      router.refresh();
    })();
  }, [orderNumber, paymentId, router]);

  if (!checking) return null;
  return (
    <p className="bg-surface-muted text-foreground-muted mt-4 rounded-md p-3 text-sm">
      Confirmando el estado de tu pago…
    </p>
  );
}
