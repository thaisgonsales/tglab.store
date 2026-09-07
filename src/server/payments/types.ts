export type PaymentProviderKey =
  "MERCADOPAGO" | "WEBPAY" | "FLOW" | "BANK_TRANSFER";

export type PaymentMethodInfo = {
  key: PaymentProviderKey;
  label: string;
  description: string;
  /** true si el proveedor tiene todo lo necesario para operar. */
  configured: boolean;
};

export type StartPaymentResult =
  | { kind: "redirect"; url: string; providerReference: string }
  | { kind: "instructions"; providerReference: string }
  | { kind: "unavailable"; reason: string };

export type WebhookEvent = {
  providerReference: string;
  status: "PAID" | "PENDING" | "REJECTED" | "CANCELLED" | "REFUNDED";
  amountPaid: number | null;
  raw: unknown;
};

export interface PaymentProvider {
  readonly key: PaymentProviderKey;
  readonly label: string;
  readonly description: string;
  /** Depende solo de variables de entorno; nunca simula credenciales. */
  isConfigured(): boolean;
  /** Inicia el pago para un pedido ya creado (montos ya fijados en la BD). */
  start(order: {
    id: string;
    number: string;
    grandTotal: number;
    email: string;
  }): Promise<StartPaymentResult>;
  /** Procesa una notificación del proveedor (webhook). Fase 8. */
  parseWebhook?(req: Request): Promise<WebhookEvent | null>;
}
