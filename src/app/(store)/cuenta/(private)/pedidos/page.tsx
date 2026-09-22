import Link from "next/link";
import { requireCustomer } from "@/server/auth/customer-session";
import { listCustomerOrders } from "@/server/services/customer-account-service";
import { getSettingsGroup } from "@/server/services/settings-service";
import { formatCLP } from "@/lib/money";
import { formatDateShort } from "@/lib/datetime";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const session = await requireCustomer();
  const { pagina } = await searchParams;
  const [result, copy] = await Promise.all([
    listCustomerOrders(session.user.id, pagina),
    getSettingsGroup("account"),
  ]);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{copy.orders}</h2>
      {!result.orders.length && <p>{copy.emptyOrders}</p>}
      <div className="space-y-3">
        {result.orders.map((order) => (
          <article
            key={order.number}
            className="bg-surface rounded-card flex flex-wrap items-center justify-between gap-4 border p-5"
          >
            <div>
              <Link
                href={`/cuenta/pedidos/${order.number}`}
                className="text-brand font-semibold underline"
              >
                {order.number}
              </Link>
              <p className="text-foreground-muted text-sm">
                {formatDateShort(order.placedAt)} ·{" "}
                {copy.orderStatuses[order.status]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCLP(order.grandTotal)}</p>
              <Link
                href={`/cuenta/pedidos/${order.number}`}
                className="text-sm underline"
              >
                {copy.viewOrder}
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-between">
        {result.page > 1 && (
          <Link href={`?pagina=${result.page - 1}`}>{copy.previous}</Link>
        )}
        {result.page < result.pages && (
          <Link href={`?pagina=${result.page + 1}`}>{copy.next}</Link>
        )}
      </div>
    </div>
  );
}
