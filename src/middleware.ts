import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth";

/**
 * Protege rotas do dashboard. Não valida a assinatura do JWT aqui
 * (edge runtime não carrega `jsonwebtoken`) — só checa presença.
 * Validação forte acontece dentro das páginas/APIs via getSession().
 */
export function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Sem nenhum cookie → manda pra login com redirect
  if (!access && !refresh) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protege tudo em /dashboard, /characters, /warehouse, etc.
  matcher: [
    "/dashboard/:path*",
    "/characters/:path*",
    "/warehouse/:path*",
    "/wallet/:path*",
    "/balance/:path*",
    "/promo-code/:path*",
    "/referrals/:path*",
    "/settings/:path*",
    "/support/:path*",
    "/rankings/:path*",
  ],
};
