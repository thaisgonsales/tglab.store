import { PageHeader } from "@/components/admin/page-header";
import { CouponManager } from "@/components/admin/coupon-manager";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function getData() {
  try {
    const [coupons, products, categories] = await Promise.all([
      db.coupon.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { uses: true } } },
      }),
      db.product.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        take: 200,
        select: { id: true, name: true },
      }),
      db.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    return { coupons, products, categories };
  } catch {
    return { coupons: [], products: [], categories: [] };
  }
}

export default async function AdminCouponsPage() {
  const { coupons, products, categories } = await getData();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Cupones"
        description="Descuentos por porcentaje, monto fijo o envío gratis."
      />
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          startsAt: c.startsAt ? c.startsAt.toISOString().slice(0, 10) : "",
          endsAt: c.endsAt ? c.endsAt.toISOString().slice(0, 10) : "",
          minSubtotal: c.minSubtotal,
          maxUses: c.maxUses,
          maxUsesPerCustomer: c.maxUsesPerCustomer,
          usedCount: c.usedCount,
          appliesToProductIds: c.appliesToProductIds,
          appliesToCategoryIds: c.appliesToCategoryIds,
          isActive: c.isActive,
          uses: c._count.uses,
        }))}
        products={products}
        categories={categories}
      />
    </div>
  );
}
