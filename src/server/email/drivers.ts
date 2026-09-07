import "server-only";

import { Resend } from "resend";

import { getEnv } from "@/lib/env";
import type { EmailMessage, EmailProvider, SendResult } from "./types";

/** Desarrollo: no envía nada, imprime el correo en la consola. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly key = "console" as const;
  isConfigured(): boolean {
    return true;
  }
  async send(msg: EmailMessage): Promise<SendResult> {
    console.info(
      `\n─── EMAIL (dev, no enviado) ───\n` +
        `Para: ${msg.to}\nAsunto: ${msg.subject}\n` +
        `${(msg.text ?? msg.html).slice(0, 600)}\n───────────────────────────────\n`,
    );
    return { id: null, provider: "console" };
  }
}

/**
 * Producción sin proveedor: NO finge el envío. Registra el fallo y devuelve
 * `id: null` para que el flujo del pedido continúe sin romperse.
 */
export class NoopEmailProvider implements EmailProvider {
  readonly key = "none" as const;
  isConfigured(): boolean {
    return false;
  }
  async send(msg: EmailMessage): Promise<SendResult> {
    console.error(
      `[email] proveedor no configurado en producción — correo NO enviado a ${msg.to} ("${msg.subject}"). ` +
        `Configura RESEND_API_KEY.`,
    );
    return { id: null, provider: "none" };
  }
}

/** Producción: Resend (https://resend.com). */
export class ResendEmailProvider implements EmailProvider {
  readonly key = "resend" as const;
  private client: Resend | null = null;

  isConfigured(): boolean {
    return Boolean(getEnv().RESEND_API_KEY);
  }

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(getEnv().RESEND_API_KEY);
    }
    return this.client;
  }

  async send(msg: EmailMessage): Promise<SendResult> {
    const env = getEnv();
    const { data, error } = await this.getClient().emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo || env.EMAIL_REPLY_TO || undefined,
    });
    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }
    return { id: data?.id ?? null, provider: "resend" };
  }
}
