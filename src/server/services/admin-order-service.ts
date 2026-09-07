import "server-only";

import { db } from "@/server/db";
import type {
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
} from "@/generated/prisma/client";

export type AdminOrderFilters = {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  page?: number;
};

export async function listAdminOrders(filters: AdminOrderFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = 20;
  const where: Prisma.OrderWhereInput = {};
  if (filters.q) {
    where.OR = [
      { number: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        number: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        paymentStatus: true,
        fulfillmentMethod: true,
        grandTotal: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      items: { include: { customizations: true } },
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { adminUser: { select: { name: true } } },
      },
      documents: true,
      stockReservations: true,
      customer: true,
    },
  });
}
