import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { afterAll, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({
  messages: [] as { to: string; url: string; kind: string }[],
}));
vi.mock("@/server/providers/auth-email", () => ({
  isAuthEmailConfigured: () => true,
  sendAuthEmail: async (to: string, url: string, kind: string) => {
    mail.messages.push({ to, url, kind });
  },
}));

import { customerAuth } from "@/server/auth/customer-auth";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import {
  getCustomerOrder,
  listCustomerOrders,
  saveCustomerAddress,
  deleteCustomerAddress,
  claimGuestOrders,
  updateCustomerProfile,
} from "@/server/services/customer-account-service";
import {
  createStaffAccount,
  setAccountAccess,
} from "@/server/services/access-management-service";

const prefix = `account-test-${randomUUID()}`;
const emails: string[] = [];
const orderIds: string[] = [];
const staffIds: string[] = [];
const password = `test-${randomUUID()}`;
const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const cookiesFor = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

async function request(
  path: string,
  body?: object,
  cookie = "",
  staff = false,
) {
  return (staff ? auth : customerAuth).handler(
    new Request(`${base}/api/${staff ? "auth" : "customer-auth"}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        origin: base,
        cookie,
        "x-forwarded-for": `10.220.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
async function signup(suffix: string) {
  const email = `${prefix}-${suffix}@example.com`;
  emails.push(email);
  const response = await request("/sign-up/email", {
    email,
    password,
    name: "Ana Prueba",
    role: "owner",
    isActive: false,
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return { id: body.user.id as string, email, cookie: cookiesFor(response) };
}

afterAll(async () => {
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.customerUser.deleteMany({ where: { email: { in: emails } } });
  await db.user.deleteMany({ where: { id: { in: staffIds } } });
});

describe("cuentas de ecommerce", () => {
  it("completa el segundo factor del personal y los códigos de recuperación", async () => {
    const id = randomUUID(); staffIds.push(id);
    const email = `${prefix}-2fa@example.com`;
    await db.user.create({ data: { id, email, name: "2FA test", role: "staff", accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } } } });
    const login = await request("/sign-in/email", { email, password }, "", true);
    expect(login.status).toBe(200);
    const setupResponse = await request("/two-factor/enable", { password }, cookiesFor(login), true);
    expect(setupResponse.status).toBe(200);
    const setup = await setupResponse.json();
    const secret = new TextDecoder().decode(base32.decode(new URL(setup.totpURI).searchParams.get("secret")!));
    const code = await createOTP(secret).totp();
    expect((await request("/two-factor/verify-totp", { code }, cookiesFor(login), true)).status).toBe(200);
    const challenge = await request("/sign-in/email", { email, password }, "", true);
    expect((await challenge.json()).twoFactorRedirect).toBe(true);
    expect(await (await request("/get-session", undefined, cookiesFor(challenge), true)).json()).toBeNull();
    const verified = await request("/two-factor/verify-totp", { code: await createOTP(secret).totp() }, cookiesFor(challenge), true);
    expect(verified.status).toBe(200);
    expect((await (await request("/get-session", undefined, cookiesFor(verified), true)).json()).user.id).toBe(id);
    const secondChallenge = await request("/sign-in/email", { email, password }, "", true);
    expect((await request("/two-factor/verify-backup-code", { code: setup.backupCodes[0] }, cookiesFor(secondChallenge), true)).status).toBe(200);
    const thirdChallenge = await request("/sign-in/email", { email, password }, "", true);
    expect((await request("/two-factor/verify-backup-code", { code: setup.backupCodes[0] }, cookiesFor(thirdChallenge), true)).status).toBeGreaterThanOrEqual(400);
  });
  it("registra clientes sin conceder permisos ni sesión de personal", async () => {
    const user = await signup("isolation");
    expect(
      await db.user.findUnique({ where: { email: user.email } }),
    ).toBeNull();
    expect(
      (await db.customerUser.findUniqueOrThrow({ where: { id: user.id } }))
        .isActive,
    ).toBe(true);
    expect(
      await (
        await request("/get-session", undefined, user.cookie, true)
      ).json(),
    ).toBeNull();
    const session = await (
      await request("/get-session", undefined, user.cookie)
    ).json();
    expect(session.user.id).toBe(user.id);
    const blocked = await request(
      "/sign-up/email",
      { email: user.email, name: "Intruso", password },
      "",
      true,
    );
    expect(blocked.status).toBeGreaterThanOrEqual(400);
    expect(
      await (
        await request(
          "/get-session",
          undefined,
          "tglab_customer.session_token=forged",
        )
      ).json(),
    ).toBeNull();
  });

  it("aísla pedidos, direcciones y snapshots por identidad", async () => {
    const a = await signup("a");
    const b = await signup("b");
    const order = await db.order.create({
      data: {
        number: `${prefix}-order`,
        accountId: a.id,
        email: a.email,
        phone: "12345678",
        firstName: "Original",
        lastName: "Compra",
        subtotal: 1234,
        grandTotal: 1234,
        internalNotes: "PRIVADO",
      },
    });
    orderIds.push(order.id);
    expect(await getCustomerOrder(b.id, order.number)).toBeNull();
    expect((await listCustomerOrders(a.id)).total).toBe(1);
    expect(await getCustomerOrder(a.id, order.number)).not.toHaveProperty(
      "internalNotes",
    );
    const address = {
      fullName: "Ana Prueba",
      phone: "+56912345678",
      region: "Región de Los Lagos",
      comuna: "Castro",
      street: "Prueba",
      number: "123",
      apartment: "",
      notes: "",
      isDefault: true,
    };
    await saveCustomerAddress(a.id, address);
    const first = await db.address.findFirstOrThrow({
      where: { accountId: a.id },
    });
    await expect(
      saveCustomerAddress(b.id, { ...address, id: first.id }),
    ).rejects.toThrow();
    await expect(deleteCustomerAddress(b.id, first.id)).rejects.toThrow();
    await saveCustomerAddress(a.id, { ...address, street: "Segunda" });
    expect(
      await db.address.count({ where: { accountId: a.id, isDefault: true } }),
    ).toBe(1);
    await updateCustomerProfile(a.id, {
      firstName: "Nuevo",
      lastName: "Nombre",
      phone: "",
      rut: "",
    });
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).firstName,
    ).toBe("Original");
  });

  it("exige verificar correo para asociar compras antiguas y no roba pedidos de otras cuentas", async () => {
    const user = await signup("verify");
    const order = await db.order.create({
      data: {
        number: `${prefix}-guest`,
        email: user.email,
        phone: "12345678",
        firstName: "Compra",
        lastName: "Invitada",
        subtotal: 999,
        grandTotal: 999,
      },
    });
    orderIds.push(order.id);
    await expect(claimGuestOrders(user.id)).rejects.toThrow(
      "EMAIL_NOT_VERIFIED",
    );
    const verification = mail.messages.find(
      (m) => m.to === user.email && m.kind === "verify",
    );
    expect(verification).toBeDefined();
    const response = await customerAuth.handler(new Request(verification!.url));
    expect(response.status).toBeLessThan(400);
    await claimGuestOrders(user.id);
    expect((await getCustomerOrder(user.id, order.number))?.number).toBe(
      order.number,
    );
    const other = await signup("verified-other");
    await db.customerUser.update({
      where: { id: other.id },
      data: { emailVerified: true },
    });
    await db.order.update({
      where: { id: order.id },
      data: { email: other.email },
    });
    await claimGuestOrders(other.id);
    expect(await getCustomerOrder(other.id, order.number)).toBeNull();
  });

  it("recupera la contraseña con token de un uso y revoca sesiones anteriores", async () => {
    const user = await signup("reset");
    const response = await request("/request-password-reset", {
      email: user.email,
      redirectTo: "/cuenta/restablecer",
    });
    const unknown = await request("/request-password-reset", {
      email: `${prefix}-missing@example.com`,
      redirectTo: "/cuenta/restablecer",
    });
    expect(await response.json()).toEqual(await unknown.json());
    const reset = mail.messages.find(
      (m) => m.to === user.email && m.kind === "reset",
    );
    expect(reset).toBeDefined();
    const token = new URL(reset!.url).pathname.split("/").pop()!;
    const result = await request("/reset-password", {
      token,
      newPassword: `${password}-new`,
    });
    expect(result.status).toBe(200);
    expect(
      await (await request("/get-session", undefined, user.cookie)).json(),
    ).toBeNull();
    expect(
      (await request("/reset-password", { token, newPassword: password }))
        .status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (await request("/sign-in/email", { email: user.email, password })).status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await request("/sign-in/email", {
          email: user.email,
          password: `${password}-new`,
        })
      ).status,
    ).toBe(200);
  });

  it("reserva gestión de accesos al propietario y corta sesiones de cuentas suspendidas", async () => {
    const actor = await db.user.create({
      data: {
        id: randomUUID(),
        name: "Owner test",
        email: `${prefix}-owner@example.com`,
        role: "owner",
      },
    });
    staffIds.push(actor.id);
    const employeeEmail = `${prefix}-employee@example.com`;
    await createStaffAccount(actor.id, {
      name: "Staff test",
      email: employeeEmail,
      password,
      role: "staff",
    });
    const employee = await db.user.findUniqueOrThrow({
      where: { email: employeeEmail },
    });
    staffIds.push(employee.id);
    await expect(
      createStaffAccount(employee.id, {
        name: "No",
        email: "no@example.com",
        password,
        role: "owner",
      }),
    ).rejects.toThrow("OWNER_REQUIRED");
    await expect(
      setAccountAccess(actor.id, {
        id: actor.id,
        isActive: false,
        kind: "staff",
      }),
    ).rejects.toThrow("CANNOT_SUSPEND_SELF");
    const signIn = await request(
      "/sign-in/email",
      { email: employeeEmail, password },
      "",
      true,
    );
    expect(signIn.status).toBe(200);
    await setAccountAccess(actor.id, {
      id: employee.id,
      isActive: false,
      kind: "staff",
    });
    expect(
      await (
        await request("/get-session", undefined, cookiesFor(signIn), true)
      ).json(),
    ).toBeNull();
    expect(
      (
        await request(
          "/sign-in/email",
          { email: employeeEmail, password },
          "",
          true,
        )
      ).status,
    ).toBeGreaterThanOrEqual(400);
    const customer = await signup("suspend");
    await setAccountAccess(actor.id, {
      id: customer.id,
      isActive: false,
      kind: "customer",
    });
    expect(
      await (await request("/get-session", undefined, customer.cookie)).json(),
    ).toBeNull();
    expect(
      (await request("/sign-in/email", { email: customer.email, password }))
        .status,
    ).toBeGreaterThanOrEqual(400);
  });
});
