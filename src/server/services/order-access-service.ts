import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { getCustomerSession } from "@/server/auth/customer-session";

const cookieName = "tglab_order_access";
const accessSchema = z.object({
  ids: z.array(z.string().max(128)).max(20),
  expires: z.number(),
});
function signature(payload: string) {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(`order-access:${payload}`)
    .digest("base64url");
}

async function guestOrderIds() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return [];
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return [];
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return [];
  try {
    const data = accessSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
    return data.expires > Date.now() ? data.ids : [];
  } catch {
    return [];
  }
}

export async function rememberGuestOrder(orderId: string) {
  const ids = [...new Set([...(await guestOrderIds()), orderId])].slice(-20);
  const maxAge = 60 * 60 * 24 * 30;
  const payload = Buffer.from(
    JSON.stringify({ ids, expires: Date.now() + maxAge * 1000 }),
  ).toString("base64url");
  (await cookies()).set(cookieName, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function canAccessOrder(order: {
  id: string;
  accountId: string | null;
}) {
  if (order.accountId) {
    const session = await getCustomerSession();
    return session?.user.id === order.accountId;
  }
  return (await guestOrderIds()).includes(order.id);
}
