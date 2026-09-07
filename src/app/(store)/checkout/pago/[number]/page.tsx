import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MercadoPagoReturn } from "@/components/store/mercadopago-return";
import { PaymentMethods } from "@/components/store/payment-methods";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { availablePaymentMethods } from "@/server/payments/registry";
import { getOrderByNumber } from "@/server/services/order-service";
import { getSettingsGroup } from "@/server/services/settings-service";

export const metadata: Metadata = {
  title: "Pago del pedido",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { number } = await params;
  const sp = await searchParams;
  const order = await getOrderByNumber(number);
  if (!order) notFound();

  const fromMercadoPago = sp.mp === "1";

  const [commerce] = await Promise.all([getSettingsGroup("commerce")]);
  const methods = availablePaymentMethods();
  const bank = commerce.bankTransferDetails;
  const expired = order.expiresAt ? order.expiresAt < new Date() : false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-card border-border bg-surface border p-6">
        <p className="text-foreground-muted text-sm">Pedido</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {order.number}
        </h1>

        {fromMercadoPago && order.paymentStatus !== "PAID" && (
          <MercadoPagoReturn
            orderNumber={order.number}
            paymentId={sp.payment_id ?? sp["data.id"]}
          />
        )}

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground-muted">Total a pagar</dt>
            <dd className="font-semibold tabular-nums">
              {formatCLP(order.grandTotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground-muted">Estado del pago</dt>
            <dd>
              {order.paymentStatus === "PAID"
                ? "Pagado"
                : order.paymentStatus === "PENDING"
                  ? "Pendiente"
                  : order.paymentStatus}
            </dd>
          </div>
        </dl>

        {order.paymentStatus === "PAID" ? (
          <div className="mt-6 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
            ¡Pago confirmado! Te enviamos los detalles a {order.email}.
            <div className="mt-2">
              <Link
                href={`/pedido?numero=${order.number}`}
                className="font-medium underline"
              >
                Ver estado del pedido
              </Link>
            </div>
          </div>
        ) : expired ? (
          <div className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
            La reserva de stock de este pedido venció. Vuelve a armar tu carrito
            para comprar estos productos.
          </div>
        ) : (
          <div className="mt-6">
            <h2 className="text-base font-semibold">Elige cómo pagar</h2>

            {methods.length === 0 ? (
              <div className="bg-surface-muted text-foreground-muted mt-3 rounded-md p-4 text-sm">
                Todavía no hay un medio de pago en línea habilitado. Guardamos
                tu pedido <strong>{order.number}</strong> por 15 minutos;
                escríbenos para coordinar el pago y confirmarlo.
              </div>
            ) : (
              <PaymentMethods
                orderNumber={order.number}
                methods={methods}
                bankDetails={{
                  accountHolder: bank.accountHolder,
                  rut: bank.rut,
                  bank: bank.bank,
                  accountType: bank.accountType,
                  accountNumber: bank.accountNumber,
                  email: bank.email,
                  instructions: commerce.bankTransferInstructions,
                }}
              />
            )}

            {order.expiresAt && (
              <p className="text-foreground-muted mt-4 text-xs">
                Reserva válida hasta {formatDateTime(order.expiresAt)}.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-foreground-muted mt-4 text-center text-xs">
        Nunca almacenamos los datos de tu tarjeta. El pago lo procesa el
        proveedor que elijas.
      </p>
    </div>
  );
}
