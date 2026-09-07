import { afterEach, describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";
import { db } from "@/server/db";
import { evaluateCoupon } from "@/server/services/coupon-service";

const created: { coupons: string[]; products: string[]; categories: string[] } =
  { coupons: [], products: [], categories: [] };

async function coupon(data: Parameters<typeof db.coupon.create>[0]["data"]) {
  const c = await db.coupon.create({ data });
  created.coupons.push(c.id);
  return c;
}

afterEach(async () => {
  await db.couponUse.deleteMany({
    where: { couponId: { in: created.coupons } },
  });
  await db.coupon.deleteMany({ where: { id: { in: created.coupons } } });
  await db.product.deleteMany({ where: { id: { in: created.products } } });
  await db.category.deleteMany({ where: { id: { in: created.categories } } });
  created.coupons.length = 0;
  created.products.length = 0;
  created.categories.length = 0;
});

const CART = {
  subtotal: 20_000,
  lines: [{ productId: null, lineTotal: 20_000 }],
};

describe("evaluateCoupon", () => {
  it("PERCENT calcula el descuento sobre el subtotal", async () => {
    await coupon({ code: "P10", type: "PERCENT", value: 10, isActive: true });
    const r = await evaluateCoupon("p10", CART);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.discount).toBe(2_000);
  });

  it("FIXED se limita al subtotal", async () => {
    await coupon({
      code: "F999",
      type: "FIXED",
      value: 999_999,
      isActive: true,
    });
    const r = await evaluateCoupon("F999", CART);
    if (!r.valid) throw new Error(r.reason);
    expect(r.discount).toBe(20_000);
  });

  it("FREE_SHIPPING no descuenta del subtotal", async () => {
    await coupon({
      code: "ENVIO",
      type: "FREE_SHIPPING",
      value: 0,
      isActive: true,
    });
    const r = await evaluateCoupon("ENVIO", CART);
    if (!r.valid) throw new Error(r.reason);
    expect(r.discount).toBe(0);
    expect(r.freeShipping).toBe(true);
  });

  it("rechaza cupón vencido", async () => {
    await coupon({
      code: "OLD",
      type: "PERCENT",
      value: 10,
      isActive: true,
      endsAt: new Date(Date.now() - 86_400_000),
    });
    const r = await evaluateCoupon("OLD", CART);
    expect(r.valid).toBe(false);
  });

  it("rechaza si no llega a la compra mínima", async () => {
    await coupon({
      code: "MIN",
      type: "FIXED",
      value: 1_000,
      isActive: true,
      minSubtotal: 50_000,
    });
    const r = await evaluateCoupon("MIN", CART);
    expect(r.valid).toBe(false);
  });

  it("rechaza al alcanzar el límite de usos", async () => {
    await coupon({
      code: "LIMIT",
      type: "PERCENT",
      value: 10,
      isActive: true,
      maxUses: 1,
      usedCount: 1,
    });
    const r = await evaluateCoupon("LIMIT", CART);
    expect(r.valid).toBe(false);
  });

  it("respeta el máximo por cliente", async () => {
    const c = await coupon({
      code: "PERCLI",
      type: "PERCENT",
      value: 10,
      isActive: true,
      maxUsesPerCustomer: 1,
    });
    const order = await db.order.create({
      data: {
        number: `TST-${Date.now()}${Math.floor(Math.random() * 999)}`,
        email: "x@y.com",
        phone: "1",
        firstName: "X",
        lastName: "Y",
        subtotal: 0,
        grandTotal: 0,
      },
    });
    await db.couponUse.create({
      data: {
        couponId: c.id,
        orderId: order.id,
        customerEmail: "x@y.com",
        amountDiscounted: 1000,
      },
    });
    const blocked = await evaluateCoupon("PERCLI", {
      ...CART,
      customerEmail: "x@y.com",
    });
    expect(blocked.valid).toBe(false);
    const ok = await evaluateCoupon("PERCLI", {
      ...CART,
      customerEmail: "otro@y.com",
    });
    expect(ok.valid).toBe(true);
    await db.couponUse.deleteMany({ where: { couponId: c.id } });
    await db.order.delete({ where: { id: order.id } });
  });

  it("aplica solo al subtotal elegible cuando está restringido a un producto", async () => {
    const name = `ZZ Cupón Prod ${Date.now()}`;
    const cat = await db.category.create({
      data: { name, slug: slugify(name) },
    });
    created.categories.push(cat.id);
    const eligible = await db.product.create({
      data: { name: `${name} A`, slug: slugify(`${name} A`), status: "DRAFT" },
    });
    const other = await db.product.create({
      data: { name: `${name} B`, slug: slugify(`${name} B`), status: "DRAFT" },
    });
    created.products.push(eligible.id, other.id);

    await coupon({
      code: "SOLOP",
      type: "PERCENT",
      value: 50,
      isActive: true,
      appliesToProductIds: [eligible.id],
    });

    const r = await evaluateCoupon("SOLOP", {
      subtotal: 30_000,
      lines: [
        { productId: eligible.id, lineTotal: 10_000 },
        { productId: other.id, lineTotal: 20_000 },
      ],
    });
    if (!r.valid) throw new Error(r.reason);
    expect(r.discount).toBe(5_000); // 50% de 10.000, no de 30.000
  });
});
