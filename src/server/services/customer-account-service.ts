import "server-only";

import { z } from "zod";
import { db } from "@/server/db";
import { addressSchema, profileSchema } from "@/lib/schemas/account";
import { normalizeRut } from "@/lib/rut";

export async function getCustomerProfile(accountId: string) {
  return db.customerUser.findUniqueOrThrow({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      firstName: true,
      lastName: true,
      phone: true,
      rut: true,
    },
  });
}

export async function updateCustomerProfile(accountId: string, input: unknown) {
  const data = profileSchema.parse(input);
  await db.customerUser.update({
    where: { id: accountId },
    data: {
      ...data,
      rut: data.rut ? normalizeRut(data.rut) : "",
      name: `${data.firstName} ${data.lastName}`,
    },
  });
}

export async function listCustomerAddresses(accountId: string) {
  return db.address.findMany({
    where: { accountId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function saveCustomerAddress(accountId: string, input: unknown) {
  const { id, ...data } = addressSchema.parse(input);
  await db.$transaction(async (tx) => {
    // Serializa cambios de direcciones de una cuenta: una sola principal.
    await tx.customerUser.update({
      where: { id: accountId },
      data: { updatedAt: new Date() },
    });
    if (id && !(await tx.address.findFirst({ where: { id, accountId } })))
      throw new Error("ADDRESS_NOT_FOUND");
    const total = await tx.address.count({ where: { accountId } });
    if (!id && total >= 20) throw new Error("ADDRESS_LIMIT");
    if (!total) data.isDefault = true;
    if (!data.isDefault && !await tx.address.count({ where: { accountId, isDefault: true, ...(id ? { id: { not: id } } : {}) } })) data.isDefault = true;
    if (data.isDefault)
      await tx.address.updateMany({
        where: { accountId },
        data: { isDefault: false },
      });
    if (id) await tx.address.update({ where: { id, accountId }, data });
    else await tx.address.create({ data: { ...data, accountId } });
  });
}

export async function deleteCustomerAddress(accountId: string, input: unknown) {
  const id = z.string().cuid().parse(input);
  await db.$transaction(async (tx) => {
    await tx.customerUser.update({
      where: { id: accountId },
      data: { updatedAt: new Date() },
    });
    const address = await tx.address.findFirst({ where: { id, accountId } });
    if (!address) throw new Error("ADDRESS_NOT_FOUND");
    await tx.address.delete({ where: { id, accountId } });
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { accountId },
        orderBy: { createdAt: "asc" },
      });
      if (next)
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
    }
  });
}

export async function listCustomerOrders(
  accountId: string,
  pageInput: unknown = 1,
) {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse(pageInput);
  const where = { accountId };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        number: true,
        placedAt: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
      },
      orderBy: { placedAt: "desc" },
      take: 12,
      skip: (page - 1) * 12,
    }),
    db.order.count({ where }),
  ]);
  return { orders, total, page, pages: Math.ceil(total / 12) };
}

export async function getCustomerOrder(accountId: string, input: unknown) {
  const parsed = z.string().trim().max(80).safeParse(input);
  if (!parsed.success) return null;
  const number = parsed.data;
  // Proyección pública: no filtrar notas internas, payloads ni IDs de personal.
  return db.order.findFirst({
    where: { accountId, number },
    select: {
      number: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      subtotal: true,
      discountTotal: true,
      shippingTotal: true,
      grandTotal: true,
      fulfillmentMethod: true,
      shippingAddress: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantLabel: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          productId: true,
          review: { select: { id: true } },
        },
      },
    },
  });
}

export async function claimGuestOrders(accountId: string) {
  const user = await db.customerUser.findUniqueOrThrow({
    where: { id: accountId },
  });
  if (!user.isActive || !user.emailVerified)
    throw new Error("EMAIL_NOT_VERIFIED");
  await db.order.updateMany({
    where: {
      accountId: null,
      email: { equals: user.email, mode: "insensitive" },
    },
    data: { accountId },
  });
}
