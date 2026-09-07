import Link from "next/link";

import { OrderFilters } from "@/components/admin/order-filters";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import type {
  OrderPaymentStatus,
  OrderStatus,
} from "@/generated/prisma/client";
import {
  listAdminOrders,
  type AdminOrderFilters,
} from "@/server/services/admin-order-service";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const PAYMENT_STATUSES: OrderPaymentStatus[] = [
  "PENDING",
  "PAID",
  "REJECTED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
];

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  EXPIRED: "Vencido",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: AdminOrderFilters = {
    q: sp.q?.trim() || undefined,
    status: ORDER_STATUSES.includes(sp.estado as OrderStatus)
      ? (sp.estado as OrderStatus)
      : undefined,
    paymentStatus: PAYMENT_STATUSES.includes(sp.pago as OrderPaymentStatus)
      ? (sp.pago as OrderPaymentStatus)
      : undefined,
    fulfillmentMethod:
      sp.entrega === "SHIPPING" || sp.entrega === "PICKUP"
        ? sp.entrega
        : undefined,
    page: Number(sp.page) || 1,
  };
  const result = await listAdminOrders(filters);

  const pageHref = (page: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) usp.set(k, v);
    usp.set("page", String(page));
    return `/admin/pedidos?${usp.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Pedidos" description={`${result.total} pedido(s)`} />

      <OrderFilters />

      {result.items.length === 0 ? (
        <p className="rounded-card border-border text-foreground-muted border border-dashed p-10 text-center text-sm">
          No hay pedidos.
        </p>
      ) : (
        <div className="rounded-card border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-surface-muted text-foreground-muted border-b text-left text-xs uppercase">
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Pago</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((o) => (
                <tr key={o.id} className="border-border border-b last:border-0">
                  <td className="p-3 font-medium">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="hover:text-brand"
                    >
                      {o.number}
                    </Link>
                    <span className="text-foreground-muted block text-xs">
                      {o._count.items} ítem(s) ·{" "}
                      {o.fulfillmentMethod === "PICKUP" ? "retiro" : "despacho"}
                    </span>
                  </td>
                  <td className="p-3">
                    {o.firstName} {o.lastName}
                    <span className="text-foreground-muted block text-xs">
                      {o.email}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{o.status}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        o.paymentStatus === "PAID"
                          ? "success"
                          : o.paymentStatus === "PENDING"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {PAYMENT_LABEL[o.paymentStatus]}
                    </Badge>
                  </td>
                  <td className="text-foreground-muted p-3">
                    {formatDateTime(o.createdAt)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatCLP(o.grandTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {result.page > 1 && (
            <Link
              href={pageHref(result.page - 1)}
              className="border-border rounded-md border px-3 py-1.5"
            >
              Anterior
            </Link>
          )}
          <span className="text-foreground-muted">
            Página {result.page} de {result.pages}
          </span>
          {result.page < result.pages && (
            <Link
              href={pageHref(result.page + 1)}
              className="border-border rounded-md border px-3 py-1.5"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
