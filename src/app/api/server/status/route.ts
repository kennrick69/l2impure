import { NextResponse } from "next/server";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { getPublicServerStatus } from "@/lib/server-status";

/**
 * GET /api/server/status — público, sem auth.
 *
 * Fonte da verdade pro status do servidor de jogo, pensado pra:
 * - client polling (landing / painel) a cada 30s;
 * - uptime monitors do JOs (UptimeRobot etc);
 * - o jogador hardcore que vai dar curl por curiosidade.
 *
 * Semântica:
 * - 200 sempre que o site consegue responder (mesmo com jogo offline —
 *   `online: false` é resposta digna, não erro).
 * - `stale: true` + header `X-Data-Stale: true` quando o dado veio do
 *   snapshot de fallback (bridge fora) ou tem mais de 90s.
 * - Nunca expõe playersRaw/dbOk/portas — só o que o jogador pode ver.
 *
 * Cache: Redis 30s no server + CDN s-maxage=15 com SWR.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(
    "serverStatus",
    ip,
    rateLimits.default.max,
    rateLimits.default.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde alguns segundos." },
      { status: 429 },
    );
  }

  const status = await getPublicServerStatus();

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
  };
  if (status.stale) {
    headers["X-Data-Stale"] = "true";
  }

  return NextResponse.json(status, { headers });
}
