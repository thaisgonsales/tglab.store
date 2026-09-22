/** Se ejecuta en un proceso aislado con --conditions=react-server. */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "../../src/server/db";

const input = z.object({ action: z.enum(["prepare", "cleanup"]), scope: z.string().regex(/^e2e-account-[a-f0-9-]{36}$/), password: z.string().min(10) }).parse(JSON.parse(readFileSync(0, "utf8")));
const { scope, password } = input;
const emails = ["owner", "customer", "staff", "guest"].map((role) => `${scope}-${role}@example.com`);
async function main() {
try {
  if (input.action === "prepare") {
    const id = randomUUID();
    await db.user.create({ data: { id, name: "Owner E2E", email: emails[0]!, role: "owner", emailVerified: true, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } } } });
    await db.product.create({ data: { name: "Producto de prueba de cuenta", slug: scope, status: "PUBLISHED", publishedAt: new Date(), variants: { create: { price: 1990, stock: 20 } } } });
  } else {
    await db.order.deleteMany({ where: { email: { in: emails } } });
    await db.customerUser.deleteMany({ where: { email: { in: emails } } });
    await db.customer.deleteMany({ where: { email: { in: emails } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.cartItem.deleteMany({ where: { variant: { product: { slug: scope } } } });
    await db.product.deleteMany({ where: { slug: scope } });
  }
} finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Account fixture failed"); process.exitCode = 1; });
