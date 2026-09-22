import "server-only";

import { WebpayPlus } from "transbank-sdk";
import { getEnv, publicEnv } from "@/lib/env";
import type { ProviderPaymentResult } from "@/server/payments/payment-service";
import type { PaymentProvider, StartPaymentResult } from "./types";

export class WebpayProvider implements PaymentProvider {
  readonly key = "WEBPAY" as const;
  readonly label = "Webpay Plus";
  readonly description =
    "Paga con tarjetas de débito, crédito o prepago mediante Transbank.";

  isConfigured() {
    const env = getEnv();
    return Boolean(env.TRANSBANK_COMMERCE_CODE && env.TRANSBANK_API_KEY);
  }

  private transaction() {
    const env = getEnv();
    return env.TRANSBANK_MODE === "production"
      ? WebpayPlus.Transaction.buildForProduction(
          env.TRANSBANK_COMMERCE_CODE,
          env.TRANSBANK_API_KEY,
        )
      : WebpayPlus.Transaction.buildForIntegration(
          env.TRANSBANK_COMMERCE_CODE,
          env.TRANSBANK_API_KEY,
        );
  }

  async start(order: {
    id: string;
    number: string;
    grandTotal: number;
    email: string;
  }): Promise<StartPaymentResult> {
    if (!this.isConfigured())
      return { kind: "unavailable", reason: "Webpay aún no está conectado." };
    try {
      const base = publicEnv.siteUrl.replace(/\/+$/, "");
      const response = await this.transaction().create(
        order.number,
        order.id.slice(0, 61),
        order.grandTotal,
        `${base}/api/payments/webpay/return`,
      );
      if (!response?.token || !response?.url)
        return {
          kind: "unavailable",
          reason: "Transbank no devolvió una sesión de pago.",
        };
      const redirect = new URL(`${base}/api/payments/webpay/redirect`);
      redirect.searchParams.set("token", String(response.token));
      redirect.searchParams.set("url", String(response.url));
      return {
        kind: "redirect",
        url: redirect.toString(),
        providerReference: String(response.token),
      };
    } catch (error) {
      console.error("[webpay] create", error);
      return {
        kind: "unavailable",
        reason: "No se pudo iniciar el pago con Webpay.",
      };
    }
  }

  async commit(token: string): Promise<ProviderPaymentResult | null> {
    if (!this.isConfigured()) return null;
    try {
      const response = await this.transaction().commit(token);
      const paid =
        response?.status === "AUTHORIZED" && response?.response_code === 0;
      return {
        provider: "WEBPAY",
        providerReference: token,
        status: paid ? "PAID" : "REJECTED",
        amountPaid:
          typeof response?.amount === "number"
            ? Math.round(response.amount)
            : null,
        orderNumber: String(response?.buy_order ?? ""),
        raw: response,
      };
    } catch (error) {
      console.error("[webpay] commit", error);
      return null;
    }
  }
}
