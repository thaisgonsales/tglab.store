export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendResult = {
  /** Id del proveedor si se envió; `null` si no había proveedor configurado. */
  id: string | null;
  provider: "resend" | "console" | "none";
};

export interface EmailProvider {
  readonly key: "resend" | "console" | "none";
  isConfigured(): boolean;
  send(msg: EmailMessage): Promise<SendResult>;
}
