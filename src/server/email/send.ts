import "server-only";

import { getEnv } from "@/lib/env";
import {
  ConsoleEmailProvider,
  NoopEmailProvider,
  ResendEmailProvider,
} from "./drivers";
import type { EmailMessage, EmailProvider, SendResult } from "./types";

let cached: EmailProvider | null = null;

/**
 * Elige el proveedor de email:
 *  - RESEND_API_KEY presente          -> Resend (envía de verdad)
 *  - sin clave y NODE_ENV=production   -> Noop (registra el fallo, NO finge)
 *  - sin clave en desarrollo/test      -> Console (imprime el correo)
 */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const env = getEnv();
  if (env.RESEND_API_KEY) cached = new ResendEmailProvider();
  else if (env.NODE_ENV === "production") cached = new NoopEmailProvider();
  else cached = new ConsoleEmailProvider();
  return cached;
}

/**
 * Envía un correo. NUNCA lanza: un fallo de email no debe romper el checkout
 * ni un cambio de estado. Devuelve el resultado para poder registrarlo.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  try {
    return await getEmailProvider().send(msg);
  } catch (err) {
    console.error(
      `[email] fallo al enviar a ${msg.to} ("${msg.subject}")`,
      err,
    );
    return { id: null, provider: "none" };
  }
}
