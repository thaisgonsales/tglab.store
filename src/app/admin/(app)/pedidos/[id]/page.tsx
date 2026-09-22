import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { OrderActions } from "@/components/admin/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { getAdminOrder } from "@/server/services/admin-order-service";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = order.shippingAddress as Record<string, string> | null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Pedido ${order.number}`}
        backHref="/admin/pedidos"
        description={`${formatDateTime(order.createdAt)} · ${order.fulfillmentMethod === "PICKUP" ? "Retiro" : "Despacho"}`}
        action={
          <>
            <Badge variant="outline">{order.status}</Badge>
            <Badge
              variant={order.paymentStatus === "PAID" ? "success" : "warning"}
            >
              {order.paymentStatus}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/pedidos/${order.id}/imprimir`}
                target="_blank"
              >
                Imprimir
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {item.productName}
                    {item.variantLabel && (
                      <span className="text-foreground-muted">
                        {" "}
                        · {item.variantLabel}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    {item.quantity} × {formatCLP(item.unitPrice)}
                  </span>
                </div>
                {item.sku && (
                  <p className="text-foreground-muted text-xs">
                    SKU: {item.sku}
                  </p>
                )}
                {item.customizations.length > 0 && (
                  <ul className="bg-surface-muted mt-1 rounded-md p-2 text-xs">
                    {item.customizations.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.label}:</span>{" "}
                        {c.value}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <dl className="border-border mt-4 space-y-1 border-t pt-3 text-sm">
            <Line label="Subtotal" value={formatCLP(order.subtotal)} />
            {order.discountTotal > 0 && (
              <Line
                label={`Descuento${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`−${formatCLP(order.discountTotal)}`}
              />
            )}
            <Line
              label={`Despacho${order.shippingRateName ? ` · ${order.shippingRateName}` : ""}`}
              value={formatCLP(order.shippingTotal)}
            />
            <div className="border-border flex justify-between border-t pt-1 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCLP(order.grandTotal)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {order.firstName} {order.lastName}
            </p>
            <p className="text-foreground-muted">{order.email}</p>
            <p className="text-foreground-muted">{order.phone}</p>
            {order.rut && (
              <p className="text-foreground-muted">RUT {order.rut}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {order.fulfillmentMethod === "PICKUP" ? (
              <p>Retiro en tienda</p>
            ) : address ? (
              <>
                <p>
                  {address.street} {address.number}
                  {address.apartment ? `, ${address.apartment}` : ""}
                </p>
                <p className="text-foreground-muted">
                  {address.comuna}, {address.region}
                </p>
                {address.notes && (
                  <p className="text-foreground-muted">{address.notes}</p>
                )}
              </>
            ) : (
              <p className="text-foreground-muted">Sin dirección</p>
            )}
            {order.customerNote && (
              <p className="bg-surface-muted mt-2 rounded-md p-2 text-xs">
                Nota del cliente: {order.customerNote}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderActions
        order={{
          id: order.id,
          number: order.number,
          status: order.status,
          paymentStatus: order.paymentStatus,
          carrier: order.carrier ?? "",
          trackingNumber: order.trackingNumber ?? "",
          trackingUrl: order.trackingUrl ?? "",
          internalNotes: order.internalNotes ?? "",
          document: order.documents[0]
            ? {
                id: order.documents[0].id,
                status: order.documents[0].status,
                folio: order.documents[0].folio ?? "",
              }
            : null,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex gap-3">
                <span className="text-foreground-muted">
                  {formatDateTime(h.createdAt)}
                </span>
                <span>
                  {h.fromStatus ? `${h.fromStatus} → ` : ""}
                  <strong>{h.toStatus}</strong>
                  {h.note && (
                    <span className="text-foreground-muted"> · {h.note}</span>
                  )}
                  {h.adminUser && (
                    <span className="text-foreground-muted">
                      {" "}
                      ({h.adminUser.name})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>

          {order.payments.length > 0 && (
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-foreground-muted mb-1 text-xs font-medium uppercase">
                Pagos
              </p>
              <ul className="space-y-1 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    {p.provider} · {p.status} · {formatCLP(p.amount)}
                    {p.providerReference && (
                      <span className="text-foreground-muted">
                        {" "}
                        · {p.providerReference}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.documents.length > 0 && (
            <div className="border-border mt-4 border-t pt-3 text-sm">
              <p className="text-foreground-muted mb-1 text-xs font-medium uppercase">
                Documento tributario
              </p>
              {order.documents.map((d) => (
                <p key={d.id}>
                  {d.type}: {d.status}
                  {d.folio ? ` · folio ${d.folio}` : ""}
                </p>
              ))}
              <p className="text-foreground-muted mt-1 text-xs">
                {order.documents.some(
                  (document) => document.status === "ISSUED",
                )
                  ? "Emisión registrada en el historial del pedido."
                  : "Pendiente de emisión manual en el portal del SII."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-foreground-muted flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
