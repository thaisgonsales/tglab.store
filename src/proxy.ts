import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_LOGIN_PATH } from "@/config/constants";

/**
 * Guarda optimista del panel: si no hay cookie de sesión, redirige al login
 * antes de renderizar. La verificación real (sesión válida, activa, rol)
 * la hace el layout del admin con `requireStaff()`.
 *
 * (En Next 16 esta convención se llama `proxy`, antes `middleware`.)
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const origins = [
    process.env.S3_PUBLIC_URL,
    process.env.NEXT_PUBLIC_SENTRY_DSN,
  ]
    .flatMap((value) => {
      try {
        return value ? [new URL(value).origin] : [];
      } catch {
        return [];
      }
    })
    .join(" ");
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${origins} https://www.google-analytics.com https://www.facebook.com`.trim(),
    `media-src 'self' blob: ${origins}`.trim(),
    `connect-src 'self' ${origins} https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com`.trim(),
    "form-action 'self' https://webpay3g.transbank.cl https://webpay3gint.transbank.cl",
    "upgrade-insecure-requests",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = [
    ADMIN_LOGIN_PATH,
    "/admin/recuperar",
    "/admin/restablecer",
  ].includes(pathname);
  const cookie = getSessionCookie(request, { cookiePrefix: "tglab_admin" });

  const maintenanceEnabled =
    process.env.STORE_MAINTENANCE_MODE?.toLowerCase() === "true";
  const isMaintenanceAsset =
    pathname.startsWith("/_next/") ||
    /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)$/i.test(pathname);
  const isMaintenanceAllowed =
    pathname === "/mantenimiento" ||
    isAdmin ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/media/") ||
    pathname === "/api/health" ||
    isMaintenanceAsset;

  if (maintenanceEnabled && !isMaintenanceAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/mantenimiento";
    url.search = "";
    const maintenanceResponse = NextResponse.rewrite(url, { status: 503 });
    maintenanceResponse.headers.set("Content-Security-Policy", csp);
    maintenanceResponse.headers.set("Cache-Control", "no-store");
    maintenanceResponse.headers.set("Retry-After", "86400");
    maintenanceResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return maintenanceResponse;
  }

  if (isAdmin && !cookie && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
