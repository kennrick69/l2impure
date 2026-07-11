import { NextResponse } from "next/server";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { getPublicServerStatus } from "@/lib/server-status";
import { cached } from "@/lib/redis";
import { prisma } from "@/lib/db";

/**
 * GET /api/status — atalho público "tudo num lugar" pra badges do site,
 * uptime monitors e curiosos. Superset de /api/server/status:
 *
 *   { online, players, contas, timestamp, ageSeconds, stale }
 *
 * - `online`/`players`/`stale` — mesmos dados de /api/server/status
 *   (bridge → Redis 30s → snapshot stale 24h; nunca 500).
 * - `contas` — total de contas registradas no SITE (Postgres, cache 60s).
 *   É métrica de hype pré-launch, não expõe nada sensível.
 * - `chars` total exigiria endpoint novo na bridge (MySQL L2J) —
 *   documentado como pendência em COMUNICACAO_SITE_SERVIDOR.md §6.
 *
 * Cache CDN: s-maxage=15 + SWR 60 (o requisito "cache 15s").
 */
export const dynamic = "force-dynamic";

async function countContas(): Promise<number | null> {
  try {
    return await cached("site:contas-count", 60, () => prisma.user.count());
  } catch (e) {
    console.warn("[/api/status] count de contas falhou:", (e as Error).message);
    return null;
  }
}

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

  const [status, contas] = await Promise.all([
    getPublicServerStatus(),
    countContas(),
  ]);

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
  };
  if (status.stale) {
    headers["X-Data-Stale"] = "true";
  }

  return NextResponse.json({ ...status, contas }, { headers });
}
