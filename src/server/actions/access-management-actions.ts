"use server";
import { revalidatePath } from "next/cache";
import { ownerAction } from "@/server/auth/action-guard";
import {
  createStaffAccount,
  setAccountAccess,
} from "@/server/services/access-management-service";

export async function createStaff(input: unknown) {
  return ownerAction(async (session) => {
    await createStaffAccount(session.user.id, input);
    revalidatePath("/admin/equipo");
  });
}
export async function changeAccountAccess(input: unknown) {
  return ownerAction(async (session) => {
    await setAccountAccess(session.user.id, input);
    revalidatePath("/admin/equipo");
    revalidatePath("/admin/clientes");
  });
}
