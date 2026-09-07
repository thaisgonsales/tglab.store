import "server-only";

import { getStaffSession, type StaffSession } from "@/server/auth/session";

/** Error controlado para acciones del panel (mensaje seguro para el cliente). */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

/**
 * Envuelve la lógica de una Server Action:
 *  - exige sesión de staff activa
 *  - captura `ActionError` (mensaje mostrable) y errores inesperados (genérico)
 */
export async function staffAction<T>(
  fn: (session: StaffSession) => Promise<T>,
): Promise<ActionResult<T>> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }
  try {
    const data = await fn(session);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.message };
    }
    console.error("[staffAction] error inesperado:", err);
    return {
      ok: false,
      error: "Ocurrió un error al procesar la operación. Intenta nuevamente.",
    };
  }
}

/** Igual que `staffAction` pero exige rol "owner". */
export async function ownerAction<T>(
  fn: (session: StaffSession) => Promise<T>,
): Promise<ActionResult<T>> {
  return staffAction(async (session) => {
    if ((session.user.role ?? "staff") !== "owner") {
      throw new ActionError("Solo el propietario puede realizar esta acción.");
    }
    return fn(session);
  });
}
