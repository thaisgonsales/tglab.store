import "server-only";

import { nanoid } from "nanoid";

import { getEnv } from "@/lib/env";
import { getSettingsGroup } from "@/server/services/settings-service";
import type { PaymentProvider, StartPaymentResult } from "./types";

/**
 * Transferencia bancaria manual. Es un método REAL: el pedido queda pendiente
 * de pago, se muestran los datos bancarios (configurados en /admin) y el equipo
 * confirma el pago manualmente desde el panel. Solo entonces baja el stock.
 */
export class BankTransferProvider implements PaymentProvider {
  readonly key = "BANK_TRANSFER" as const;
  readonly label = "Transferencia bancaria";
  readonly description =
    "Te mostramos los datos para transferir. Confirmamos tu pedido al recibir el pago.";

  isConfigured(): boolean {
    return getEnv().PAYMENTS_BANK_TRANSFER_ENABLED;
  }

  async start(): Promise<StartPaymentResult> {
    if (!this.isConfigured()) {
      return { kind: "unavailable", reason: "Método no disponible." };
    }
    const commerce = await getSettingsGroup("commerce");
    const d = commerce.bankTransferDetails;
    if (!d.accountNumber || !d.bank) {
      return {
        kind: "unavailable",
        reason:
          "Los datos bancarios aún no están configurados. Contáctanos para coordinar el pago.",
      };
    }
    return { kind: "instructions", providerReference: `BT-${nanoid(12)}` };
  }
}
