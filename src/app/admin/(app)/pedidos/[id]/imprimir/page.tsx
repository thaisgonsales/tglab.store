import { notFound } from "next/navigation";

import { PrintTrigger } from "@/components/admin/print-trigger";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { getAdminOrder } from "@/server/services/admin-order-service";
import { getSettingsGroup } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, brand] = await Promise.all([
    getAdminOrder(id),
    getSettingsGroup("brand"),
  ]);
  if (!order) notFound();

  const address = order.shippingAddress as Record<string, string> | null;

  return (
    <div className="mx-auto max-w-lg bg-white p-6 text-sm text-black">
      <PrintTrigger />

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{brand.storeName}</span>
        <span className="text-right">
          <span className="block font-semibold">{order.number}</span>
          <span className="text-xs">{formatDateTime(order.createdAt)}</span>
        </span>
      </div>

      <hr className="my-4 border-gray-300" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold">Cliente</p>
          <p>
            {order.firstName} {order.lastName}
          </p>
          <p>{order.phone}</p>
          <p>{order.email}</p>
          {order.rut && <p>RUT {order.rut}</p>}
        </div>
        <div>
          <p className="font-semibold">
            {order.fulfillmentMethod === "PICKUP" ? "Retiro" : "Despacho"}
          </p>
          {order.fulfillmentMethod === "PICKUP" ? (
            <p>Retiro en tienda</p>
          ) : address ? (
            <>
              <p>
                {address.street} {address.number}
                {address.apartment ? `, ${address.apartment}` : ""}
              </p>
              <p>
                {address.comuna}, {address.region}
              </p>
              {address.notes && <p className="text-xs">{address.notes}</p>}
            </>
          ) : null}
          {order.shippingRateName && (
            <p className="text-xs">{order.shippingRateName}</p>
          )}
        </div>
      </div>

      <hr className="my-4 border-gray-300" />

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-1">Cant.</th>
            <th className="py-1">Producto</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-100 align-top">
              <td className="py-1.5">{it.quantity}</td>
              <td className="py-1.5">
                {it.productName}
                {it.variantLabel ? ` · ${it.variantLabel}` : ""}
                {it.sku ? (
                  <span className="block text-xs text-gray-500">
                    SKU {it.sku}
                  </span>
                ) : null}
                {it.customizations.length > 0 && (
                  <ul className="mt-0.5 text-xs">
                    {it.customizations.map((c) => (
                      <li key={c.id}>
                        <strong>{c.label}:</strong> {c.value}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="py-1.5 text-right">{formatCLP(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-48 text-right">
        <p>Subtotal: {formatCLP(order.subtotal)}</p>
        {order.discountTotal > 0 && (
          <p>Descuento: −{formatCLP(order.discountTotal)}</p>
        )}
        <p>Despacho: {formatCLP(order.shippingTotal)}</p>
        <p className="font-bold">Total: {formatCLP(order.grandTotal)}</p>
      </div>

      {order.customerNote && (
        <>
          <hr className="my-4 border-gray-300" />
          <p className="text-xs">
            <strong>Nota del cliente:</strong> {order.customerNote}
          </p>
        </>
      )}
    </div>
  );
}
