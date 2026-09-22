import "server-only";

import { BankTransferProvider } from "./bank-transfer";
import { MercadoPagoProvider } from "./mercadopago";
import { WebpayProvider } from "./webpay";
import type { PaymentMethodInfo, PaymentProvider } from "./types";

const PROVIDERS: PaymentProvider[] = [
  new MercadoPagoProvider(),
  new WebpayProvider(),
  new BankTransferProvider(),
];

export function allProviders(): PaymentProvider[] {
  return PROVIDERS;
}

export function getProvider(key: string): PaymentProvider | null {
  return PROVIDERS.find((p) => p.key === key) ?? null;
}

/** Métodos de pago disponibles para el cliente (solo los configurados). */
export function availablePaymentMethods(): PaymentMethodInfo[] {
  return PROVIDERS.filter((p) => p.isConfigured()).map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    configured: true,
  }));
}

/** Todos los métodos con su estado, para el panel de administración. */
export function paymentMethodsStatus(): PaymentMethodInfo[] {
  return PROVIDERS.map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    configured: p.isConfigured(),
  }));
}
