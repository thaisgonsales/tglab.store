import { NextResponse, type NextRequest } from "next/server";

import { MercadoPagoProvider } from "@/server/payments/mercadopago";
import { applyProviderPayment } from "@/server/payments/payment-service";

export const runtime = "nodejs";

/**
 * Webhook de Mercado Pago. Fuente confiable del estado del pago (más que el
 * retorno del navegador). Valida la firma, consulta el pago en la API de MP,
 * y aplica el resultado al pedido de forma idempotente.
 *
 * Responde 200 siempre que el evento se haya procesado o ignorado
 * correctamente, para que MP no reintente indefinidamente.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const provider = new MercadoPagoProvider();
  if (!provider.isConfigured()) {
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }

  const parsed = await provider.parseWebhook(req);
  if (!parsed) {
    // Firma inválida o evento no relevante: no reintentar.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await provider.fetchPayment(parsed.paymentId);
  if (!result) {
    return NextResponse.json({ ok: true, ignored: "payment_not_found" });
  }

  try {
    await applyProviderPayment(result);
  } catch (err) {
    console.error("[webhook/mercadopago] apply", err);
    // 500 -> MP reintentará más tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse {
  return NextResponse.json({ ok: true, service: "mercadopago-webhook" });
}
