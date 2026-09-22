import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token") ?? "";
  const target = params.get("url") ?? "";
  if (!token || !/^https:\/\/webpay3g(?:int)?\.transbank\.cl\//i.test(target))
    return new NextResponse("Solicitud inválida", { status: 400 });
  const escapedTarget = target.replace(/[&<>"']/g, "");
  const escapedToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Conectando con Webpay…</title></head><body><form id="webpay" method="post" action="${escapedTarget}"><input type="hidden" name="token_ws" value="${escapedToken}"><noscript><button type="submit">Continuar a Webpay</button></noscript></form><script>document.getElementById('webpay').submit()</script></body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
