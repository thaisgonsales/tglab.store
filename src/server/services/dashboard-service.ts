import "server-only";

import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns";

import { STORE_TIMEZONE } from "@/lib/datetime";
import { db } from "@/server/db";
import { getSettingsGroup } from "@/server/services/settings-service";

export type DashboardMetrics = {
  revenue: { today: number; week: number; month: number };
  orders: {
    today: number;
    pendingPayment: number;
    paid: number;
    preparing: number;
    shipped: number;
  };
  inventory: { lowStock: number; outOfStock: number };
  recentOrders: {
    id: string;
    number: string;
    total: number;
    status: string;
    createdAt: Date;
    customerName: string;
  }[];
  available: boolean;
};

const EMPTY: DashboardMetrics = {
  revenue: { today: 0, week: 0, month: 0 },
  orders: { today: 0, pendingPayment: 0, paid: 0, preparing: 0, shipped: 0 },
  inventory: { lowStock: 0, outOfStock: 0 },
  recentOrders: [],
  available: false,
};

const PAID_STATUSES = [
  "PAID",
  "PREPARING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
] as const;

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const now = new TZDate(new Date(), STORE_TIMEZONE);
    const todayStart = startOfDay(now);
    const weekStart = subDays(todayStart, 7);
    const monthStart = startOfMonth(now);
    const todayEnd = endOfDay(now);

    const commerce = await getSettingsGroup("commerce");

    const [
      revenueToday,
      revenueWeek,
      revenueMonth,
      ordersToday,
      byStatus,
      lowStock,
      outOfStock,
      recent,
    ] = await Promise.all([
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          paidAt: { gte: todayStart, lte: todayEnd },
          paymentStatus: "PAID",
        },
      }),
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: { paidAt: { gte: weekStart }, paymentStatus: "PAID" },
      }),
      db.order.aggregate({
        _sum: { grandTotal: true },
        where: { paidAt: { gte: monthStart }, paymentStatus: "PAID" },
      }),
      db.order.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.order.groupBy({ by: ["status"], _count: true }),
      db.productVariant.count({
        where: {
          isActive: true,
          stock: { gt: 0, lte: commerce.lowStockThreshold },
        },
      }),
      db.productVariant.count({ where: { isActive: true, stock: { lte: 0 } } }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          number: true,
          grandTotal: true,
          status: true,
          createdAt: true,
          firstName: true,
          lastName: true,
        },
      }),
    ]);

    const statusCount = (s: string) =>
      byStatus.find((r) => r.status === s)?._count ?? 0;

    return {
      revenue: {
        today: revenueToday._sum.grandTotal ?? 0,
        week: revenueWeek._sum.grandTotal ?? 0,
        month: revenueMonth._sum.grandTotal ?? 0,
      },
      orders: {
        today: ordersToday,
        pendingPayment: statusCount("PENDING_PAYMENT"),
        paid: statusCount("PAID"),
        preparing: statusCount("PREPARING"),
        shipped: statusCount("SHIPPED"),
      },
      inventory: { lowStock, outOfStock },
      recentOrders: recent.map((o) => ({
        id: o.id,
        number: o.number,
        total: o.grandTotal,
        status: o.status,
        createdAt: o.createdAt,
        customerName: `${o.firstName} ${o.lastName}`.trim(),
      })),
      available: true,
    };
  } catch {
    return EMPTY;
  }
}

export { PAID_STATUSES };
