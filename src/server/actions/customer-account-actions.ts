"use server";

import { revalidatePath } from "next/cache";
import { getCustomerSession } from "@/server/auth/customer-session";
import { getSettingsGroup } from "@/server/services/settings-service";
import * as service from "@/server/services/customer-account-service";

async function run(operation: (id: string) => Promise<void>) {
  const session = await getCustomerSession();
  const copy = await getSettingsGroup("account");
  if (!session) return { ok: false as const, error: copy.invalidCredentials };
  try {
    await operation(session.user.id);
    revalidatePath("/cuenta", "layout");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: copy.genericError };
  }
}

export async function saveProfile(input: unknown) {
  return run((id) => service.updateCustomerProfile(id, input));
}
export async function saveAddress(input: unknown) {
  return run((id) => service.saveCustomerAddress(id, input));
}
export async function removeAddress(input: unknown) {
  return run((id) => service.deleteCustomerAddress(id, input));
}
export async function associateOrders() {
  return run(service.claimGuestOrders);
}
