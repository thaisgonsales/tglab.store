import { notFound } from "next/navigation";
import { requireCustomer } from "@/server/auth/customer-session";
import { getCustomerOrder } from "@/server/services/customer-account-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { formatCLP } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { ReviewForm } from "@/components/account/review-form";

export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const session = await requireCustomer();
  const { number } = await params;
  const [order, copy] = await Promise.all([
    getCustomerOrder(session.user.id, number),
    getSettingsGroup("account"),
  ]);
  if (!order) notFound();
  const address = order.shippingAddress;
  const safeTracking =
    order.trackingUrl && /^https?:\/\//i.test(order.trackingUrl)
      ? order.trackingUrl
      : null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {copy.orderNumber} {order.number}
        </h2>
        <p className="text-foreground-muted text-sm">
          {formatDateTime(order.placedAt)}
        </p>
      </div>
      <div className="bg-surface rounded-card space-y-2 border p-5">
        <p>
          {copy.orderStatus}:{" "}
          <strong>{copy.orderStatuses[order.status]}</strong>
        </p>
        <p>
          {copy.payment}: {copy.paymentStatuses[order.paymentStatus]}
        </p>
      </div>
      <section className="bg-surface rounded-card space-y-4 border p-5">
        <h3 className="font-semibold">{copy.orderItems}</h3>
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-4 border-b pb-3 text-sm"
          >
            <div>
              {item.productName}
              <p className="text-foreground-muted">
                {item.variantLabel} · {item.quantity} ×{" "}
                {formatCLP(item.unitPrice)}
              </p>
            </div>
            <p>{formatCLP(item.lineTotal)}</p>
            {order.paymentStatus === "PAID" &&
              item.productId &&
              !item.review && (
                <div className="mt-3">
                  <p className="text-brand text-xs font-semibold">
                    Compra verificada · deja tu reseña
                  </p>
                  <ReviewForm orderItemId={item.id} />
                </div>
              )}
            {item.review && (
              <p className="mt-2 text-xs text-emerald-700">
                Reseña verificada publicada
              </p>
            )}
          </div>
        ))}
        <dl className="ml-auto max-w-sm space-y-2 text-sm">
          {(
            [
              [copy.subtotal, order.subtotal],
              [copy.discount, -order.discountTotal],
              [copy.shippingCost, order.shippingTotal],
              [copy.total, order.grandTotal],
            ] as const
          ).map(([label, value]) => (
            <div className="flex justify-between gap-4" key={label}>
              <dt>{label}</dt>
              <dd className="font-semibold">{formatCLP(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      {address && typeof address === "object" && !Array.isArray(address) && (
        <section className="bg-surface rounded-card space-y-2 border p-5">
          <h3 className="font-semibold">{copy.shipping}</h3>
          <p className="text-sm">
            {["street", "number", "apartment", "comuna", "region"]
              .map((key) =>
                typeof address[key] === "string" ? address[key] : null,
              )
              .filter(Boolean)
              .join(", ")}
          </p>
          {order.trackingNumber && (
            <p>
              {order.carrier} · {order.trackingNumber}
            </p>
          )}
          {safeTracking && (
            <a
              href={safeTracking}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline"
            >
              {copy.tracking}
            </a>
          )}
        </section>
      )}
    </div>
  );
}
