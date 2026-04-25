import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";

/**
 * Protege rotas do dashboard. Edge runtime — imports devem ser puros.
 * NÃO importar @/lib/auth aqui (puxa Prisma + jsonwebtoken + node:crypto,
 * que não rodam em edge e derrubam o middleware).
 *
 * Só checa PRESENÇA dos cookies; validação forte do JWT acontece
 * dentro das páginas/APIs via getSession().
 */
export function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!access && !refresh) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Inclui tanto a rota exata quanto as sub-rotas (`/dashboard` e `/dashboard/...`)
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/characters",
    "/characters/:path*",
    "/warehouse",
    "/warehouse/:path*",
    "/wallet",
    "/wallet/:path*",
    "/balance",
    "/balance/:path*",
    "/promo-code",
    "/promo-code/:path*",
    "/referrals",
    "/referrals/:path*",
    "/settings",
    "/settings/:path*",
    "/support",
    "/support/:path*",
    "/rankings",
    "/rankings/:path*",
  ],
};
