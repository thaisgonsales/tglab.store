import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import {
  listAdminOrders,
  type AdminOrderFilters,
} from "@/server/services/admin-order-service";

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
    page: Number(sp.page) || 1,
  };
  const result = await listAdminOrders(filters);

  return (
    <div>
      <PageHeader title="Pedidos" description={`${result.total} pedido(s)`} />

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Buscar por número, email o nombre…"
          className="border-border bg-surface h-10 w-full max-w-sm rounded-md border px-3 text-sm"
        />
      </form>

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
    </div>
  );
}
