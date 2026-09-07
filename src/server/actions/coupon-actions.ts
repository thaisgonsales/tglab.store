"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { couponInputSchema } from "@/lib/schemas/coupon";
import { ActionError, staffAction } from "@/server/auth/action-guard";
import { db } from "@/server/db";

function toDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function payload(data: z.infer<typeof couponInputSchema>) {
  return {
    code: data.code,
    type: data.type,
    value: data.type === "FREE_SHIPPING" ? 0 : data.value,
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    minSubtotal: data.minSubtotal,
    maxUses: data.maxUses,
    maxUsesPerCustomer: data.maxUsesPerCustomer,
    appliesToProductIds: data.appliesToProductIds,
    appliesToCategoryIds: data.appliesToCategoryIds,
    isActive: data.isActive,
  };
}

export async function createCoupon(input: z.input<typeof couponInputSchema>) {
  return staffAction(async () => {
    const data = couponInputSchema.parse(input);
    const existing = await db.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new ActionError("Ya existe un cupón con ese código.");
    const coupon = await db.coupon.create({ data: payload(data) });
    revalidatePath("/admin/cupones");
    return { id: coupon.id };
  });
}

export async function updateCoupon(
  id: string,
  input: z.input<typeof couponInputSchema>,
) {
  return staffAction(async () => {
    const data = couponInputSchema.parse(input);
    const current = await db.coupon.findUnique({ where: { id } });
    if (!current) throw new ActionError("El cupón no existe.");
    if (data.code !== current.code) {
      const clash = await db.coupon.findUnique({ where: { code: data.code } });
      if (clash) throw new ActionError("Ya existe un cupón con ese código.");
    }
    await db.coupon.update({ where: { id }, data: payload(data) });
    revalidatePath("/admin/cupones");
    return { id };
  });
}

export async function setCouponActive(id: string, isActive: boolean) {
  return staffAction(async () => {
    await db.coupon.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/cupones");
    return null;
  });
}

export async function deleteCoupon(id: string) {
  return staffAction(async () => {
    const uses = await db.couponUse.count({ where: { couponId: id } });
    if (uses > 0) {
      throw new ActionError(
        "Este cupón ya se usó en pedidos. Desactívalo en vez de eliminarlo.",
      );
    }
    await db.coupon.delete({ where: { id } });
    revalidatePath("/admin/cupones");
    return null;
  });
}
