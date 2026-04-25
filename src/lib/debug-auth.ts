import { NextResponse } from "next/server";
import { env } from "./env";

/**
 * Guard padrão pros endpoints /api/debug/*.
 * Retorna NextResponse de erro se a request não tem permissão,
 * ou null se pode prosseguir.
 *
 * Camadas de proteção:
 * 1. ENABLE_DEBUG_ENDPOINTS=false desliga TODOS os debug routes
 *    (kill switch pra usar quando o servidor estiver em produção real)
 * 2. DEBUG_KEY precisa estar setada no env (>= 8 chars, validado em env.ts)
 * 3. Query param ?key= precisa bater com DEBUG_KEY
 *
 * Uso:
 *   const guard = assertDebugAccess(req);
 *   if (guard) return guard;
 *   // ... continua normalmente
 */
export function assertDebugAccess(req: Request): NextResponse | null {
  if (!env.debugEndpointsEnabled()) {
    return NextResponse.json(
      {
        error:
          "Debug endpoints desativados (DEBUG_KEY ausente OU ENABLE_DEBUG_ENDPOINTS=false)",
      },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key !== env.DEBUG_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
