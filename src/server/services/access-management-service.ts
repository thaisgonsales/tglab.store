import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { accountEmail, accountPassword } from "@/lib/schemas/account";

export const staffAccountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: accountEmail,
  password: accountPassword,
  role: z.enum(["owner", "staff"]),
});
export const accessStatusSchema = z.object({
  id: z.string().min(1).max(128),
  isActive: z.boolean(),
  kind: z.enum(["staff", "customer"]),
});

async function assertOwner(actorId: string) {
  const actor = await db.user.findUnique({ where: { id: actorId } });
  if (!actor?.isActive || actor.banned || actor.role !== "owner")
    throw new Error("OWNER_REQUIRED");
}

export async function createStaffAccount(actorId: string, input: unknown) {
  await assertOwner(actorId);
  const data = staffAccountSchema.parse(input);
  const password = await hashPassword(data.password);
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      name: data.name,
      email: data.email,
      role: data.role,
      emailVerified: false,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password,
        },
      },
    },
  });
}

export async function setAccountAccess(actorId: string, input: unknown) {
  await assertOwner(actorId);
  const data = accessStatusSchema.parse(input);
  await db.$transaction(async (tx) => {
    if (data.kind === "customer") {
      await tx.customerUser.update({
        where: { id: data.id },
        data: { isActive: data.isActive },
      });
      if (!data.isActive)
        await tx.customerSession.deleteMany({ where: { userId: data.id } });
      return;
    }
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73519021)::text`;
    const target = await tx.user.findUniqueOrThrow({ where: { id: data.id } });
    if (!data.isActive) {
      if (data.id === actorId) throw new Error("CANNOT_SUSPEND_SELF");
      if (
        target.role === "owner" &&
        (await tx.user.count({
          where: {
            role: "owner",
            isActive: true,
            banned: false,
            id: { not: data.id },
          },
        })) === 0
      )
        throw new Error("LAST_OWNER");
    }
    await tx.user.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    });
    if (!data.isActive)
      await tx.session.deleteMany({ where: { userId: data.id } });
  });
}

export async function listStaffAccounts() {
  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      twoFactorEnabled: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function listCustomerAccounts(pageInput: unknown) {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse(pageInput);
  const [accounts, total] = await Promise.all([
    db.customerUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        emailVerified: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
    db.customerUser.count(),
  ]);
  return { accounts, page, pages: Math.ceil(total / 30) };
}
