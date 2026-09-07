import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { getDashboardMetrics } from "@/server/services/dashboard-service";

export default async function AdminDashboardPage() {
  const m = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-foreground-muted text-sm">
          Resumen de la tienda TG LAB.
        </p>
      </div>

      {!m.available && (
        <div className="rounded-card border-border text-foreground-muted border border-dashed p-4 text-sm">
          Aún no hay datos suficientes para mostrar métricas.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Ventas hoy" value={formatCLP(m.revenue.today)} />
        <Stat label="Ventas 7 días" value={formatCLP(m.revenue.week)} />
        <Stat label="Ventas del mes" value={formatCLP(m.revenue.month)} />
        <Stat label="Pedidos hoy" value={String(m.orders.today)} />
        <Stat
          label="Pendientes de pago"
          value={String(m.orders.pendingPayment)}
        />
        <Stat label="Pagados" value={String(m.orders.paid)} />
        <Stat label="En preparación" value={String(m.orders.preparing)} />
        <Stat label="Stock bajo" value={String(m.inventory.lowStock)} />
        <Stat label="Agotados" value={String(m.inventory.outOfStock)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ventas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {m.recentOrders.length === 0 ? (
            <p className="text-foreground-muted text-sm">
              No hay pedidos todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-foreground-muted border-b text-left text-xs uppercase">
                    <th className="py-2 pr-4">Pedido</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentOrders.map((o) => (
                    <tr key={o.id} className="border-border/60 border-b">
                      <td className="py-2 pr-4 font-medium">
                        <Link
                          href={`/admin/pedidos/${o.id}`}
                          className="hover:text-brand"
                        >
                          {o.number}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{o.customerName || "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{o.status}</Badge>
                      </td>
                      <td className="text-foreground-muted py-2 pr-4">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCLP(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 pt-4">
        <p className="text-foreground-muted text-xs tracking-wide uppercase">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
