import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { customerAuth } from "@/server/auth/customer-auth";

export const getCustomerSession = cache(async () => {
  const session = await customerAuth.api.getSession({
    headers: await headers(),
  });
  return session?.user.isActive ? session : null;
});

export async function requireCustomer() {
  const session = await getCustomerSession();
  if (!session) redirect("/cuenta/login");
  return session;
}
