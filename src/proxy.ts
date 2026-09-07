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
  const { pathname } = request.nextUrl;
  const isLogin = pathname === ADMIN_LOGIN_PATH;
  const cookie = getSessionCookie(request, { cookiePrefix: "tglab_admin" });

  if (!cookie && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (cookie && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
