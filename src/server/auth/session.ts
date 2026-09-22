import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_LOGIN_PATH, type AdminRole } from "@/config/constants";
import { auth } from "@/server/auth/auth";

export type StaffSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/** Devuelve la sesión de staff o `null`. No redirige. */
export async function getStaffSession(): Promise<StaffSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (session.user.isActive === false) return null;
  if (session.user.banned) return null;
  if (!["owner", "staff"].includes(session.user.role ?? "")) return null;
  return session as StaffSession;
}

/** Exige sesión de staff activa; redirige a login si no hay. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}

/** Exige un rol concreto (p. ej. "owner"); si no, 404 lógico vía redirect. */
export async function requireRole(role: AdminRole): Promise<StaffSession> {
  const session = await requireStaff();
  const userRole = (session.user.role ?? "staff") as AdminRole;
  if (role === "owner" && userRole !== "owner") {
    redirect("/admin");
  }
  return session;
}

export function isOwner(session: StaffSession | null): boolean {
  return (session?.user.role ?? "") === "owner";
}
