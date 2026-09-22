import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { WebpayProvider } from "@/server/payments/webpay";
import { applyProviderPayment } from "@/server/payments/payment-service";
import { db } from "@/server/db";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token_ws") ?? "");
  const base = publicEnv.siteUrl.replace(/\/+$/, "");
  if (!token)
    return NextResponse.redirect(`${base}/pedido?estado=cancelado`, 303);
  const existing = await db.payment.findFirst({
    where: { provider: "WEBPAY", providerReference: token },
    select: { order: { select: { number: true } } },
  });
  const result = await new WebpayProvider().commit(token);
  if (result?.orderNumber) await applyProviderPayment(result);
  const number = result?.orderNumber || existing?.order.number;
  return NextResponse.redirect(
    number
      ? `${base}/checkout/pago/${encodeURIComponent(number)}?webpay=1`
      : `${base}/pedido`,
    303,
  );
}
