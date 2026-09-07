import "server-only";

import { getEnv } from "@/lib/env";
import type { PaymentProvider, StartPaymentResult } from "./types";

/**
 * Mercado Pago (Chile). La integración real (Checkout Pro + webhook + firma)
 * se implementa en la Fase 8, siguiendo la documentación oficial vigente.
 *
 * Mientras `MERCADOPAGO_ACCESS_TOKEN` esté vacío, `isConfigured()` es `false`,
 * el método NO aparece en el checkout y NO se simula ningún pago.
 */
export class MercadoPagoProvider implements PaymentProvider {
  readonly key = "MERCADOPAGO" as const;
  readonly label = "Mercado Pago";
  readonly description =
    "Tarjetas de crédito y débito, y saldo de Mercado Pago.";

  isConfigured(): boolean {
    const env = getEnv();
    return Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_PUBLIC_KEY);
  }

  async start(): Promise<StartPaymentResult> {
    if (!this.isConfigured()) {
      return {
        kind: "unavailable",
        reason:
          "El pago con Mercado Pago se habilita al conectar las credenciales (Fase 8).",
      };
    }
    // Fase 8: crear preferencia con el SDK oficial y devolver init_point.
    return {
      kind: "unavailable",
      reason: "Integración de Mercado Pago pendiente (Fase 8).",
    };
  }
}
