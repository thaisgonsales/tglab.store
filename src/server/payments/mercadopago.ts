import "server-only";

import {
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";

import { getEnv, publicEnv } from "@/lib/env";
import type { ProviderPaymentResult } from "@/server/payments/payment-service";
import type { PaymentProvider, StartPaymentResult } from "./types";

/**
 * Mercado Pago — Checkout Pro (Chile).
 * Documentación: https://www.mercadopago.cl/developers (SDK oficial `mercadopago`).
 *
 * Mientras falten `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_PUBLIC_KEY`,
 * `isConfigured()` es `false`, el método NO aparece en el checkout y NO se
 * simula ningún pago.
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

  private config(): MercadoPagoConfig {
    return new MercadoPagoConfig({
      accessToken: getEnv().MERCADOPAGO_ACCESS_TOKEN,
    });
  }

  async start(order: {
    id: string;
    number: string;
    grandTotal: number;
    email: string;
  }): Promise<StartPaymentResult> {
    if (!this.isConfigured()) {
      return {
        kind: "unavailable",
        reason: "Mercado Pago aún no está conectado.",
      };
    }

    const env = getEnv();
    const base = publicEnv.siteUrl.replace(/\/+$/, "");
    const preference = new Preference(this.config());

    try {
      const res = await preference.create({
        body: {
          items: [
            {
              id: order.number,
              title: `Pedido ${order.number}`,
              quantity: 1,
              unit_price: order.grandTotal,
              currency_id: "CLP",
            },
          ],
          payer: { email: order.email },
          // external_reference sincroniza el pago con nuestro pedido.
          external_reference: order.number,
          back_urls: {
            success: `${base}/checkout/pago/${order.number}?mp=1`,
            pending: `${base}/checkout/pago/${order.number}?mp=1`,
            failure: `${base}/checkout/pago/${order.number}?mp=1`,
          },
          auto_return: "approved",
          notification_url: `${base}/api/webhooks/mercadopago`,
          statement_descriptor: "TG LAB",
        },
        requestOptions: { idempotencyKey: `pref-${order.id}` },
      });

      const url =
        env.MERCADOPAGO_MODE === "production"
          ? res.init_point
          : (res.sandbox_init_point ?? res.init_point);

      if (!url || !res.id) {
        return {
          kind: "unavailable",
          reason: "Mercado Pago no devolvió el enlace de pago.",
        };
      }
      return { kind: "redirect", url, providerReference: String(res.id) };
    } catch (err) {
      console.error("[mercadopago] preference.create", err);
      return {
        kind: "unavailable",
        reason: "No se pudo iniciar el pago con Mercado Pago.",
      };
    }
  }

  /**
   * Consulta un pago por id y lo traduce a nuestro modelo. Se usa desde el
   * webhook y desde el retorno del checkout (fuente confiable = la API de MP,
   * nunca los parámetros de la URL).
   */
  async fetchPayment(paymentId: string): Promise<ProviderPaymentResult | null> {
    if (!this.isConfigured()) return null;
    try {
      const payment = new Payment(this.config());
      const p = await payment.get({ id: paymentId });
      const status = mapStatus(p.status);
      if (!p.external_reference || !status) return null;
      return {
        provider: "MERCADOPAGO",
        providerReference: String(p.id ?? paymentId),
        status,
        amountPaid:
          typeof p.transaction_amount === "number"
            ? Math.round(p.transaction_amount)
            : null,
        orderNumber: p.external_reference,
        raw: p as unknown,
      };
    } catch (err) {
      console.error("[mercadopago] payment.get", err);
      return null;
    }
  }

  /** Valida la firma del webhook y extrae el id del pago. */
  async parseWebhook(req: Request): Promise<{ paymentId: string } | null> {
    const env = getEnv();
    const url = new URL(req.url);
    const dataId =
      url.searchParams.get("data.id") ?? url.searchParams.get("id");

    let body: { type?: string; action?: string; data?: { id?: string } } = {};
    try {
      body = await req.json();
    } catch {
      /* algunos eventos vienen solo por querystring */
    }

    const type = body.type ?? url.searchParams.get("type") ?? "";
    const paymentId = body.data?.id ?? dataId ?? "";
    if (!type.includes("payment") || !paymentId) return null;

    if (env.MERCADOPAGO_WEBHOOK_SECRET) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: req.headers.get("x-signature"),
          xRequestId: req.headers.get("x-request-id"),
          dataId,
          secret: env.MERCADOPAGO_WEBHOOK_SECRET,
          toleranceSeconds: 300,
        });
      } catch (err) {
        console.warn("[mercadopago] firma de webhook inválida", err);
        return null;
      }
    }

    return { paymentId: String(paymentId) };
  }
}

function mapStatus(
  s: string | undefined,
): ProviderPaymentResult["status"] | null {
  switch (s) {
    case "approved":
      return "PAID";
    case "authorized":
    case "in_process":
    case "pending":
      return "PENDING";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return null;
  }
}
