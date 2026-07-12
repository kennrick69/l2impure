import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { bridge, BridgeError } from "@/lib/bridge";
import { detectCity } from "@/lib/l2j-cities";

/**
 * GET /api/admin/online — forward pro /players/online da bridge.
 * Consumido pelo painel /admin/online (auto-refresh 5s).
 * Enriquece cada player com `city` (coords → cidade, ver l2j-cities.ts).
 */

const querySchema = z.object({
  search: z.string().max(45).optional(),
  levelMin: z.coerce.number().int().min(0).max(127).optional(),
  levelMax: z.coerce.number().int().min(0).max(127).optional(),
  classId: z.coerce.number().int().min(0).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  // Auto-refresh 5s = 12 req/min por admin; 40/min dá folga sem abrir flood
  const rl = await rateLimit("admin_online", String(admin.userId), 40, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
  }
  const q = parsed.data;

  try {
    const data = await bridge.onlinePlayers({
      search: q.search,
      levelMin: q.levelMin,
      levelMax: q.levelMax,
      classId: q.classId,
      limit: q.limit,
      offset: q.offset,
    });
    return NextResponse.json({
      ...data,
      players: data.players.map((p) => ({
        ...p,
        city: detectCity(p.x, p.y) ?? `[${p.x}, ${p.y}]`,
      })),
    });
  } catch (e) {
    if (e instanceof BridgeError) {
      return NextResponse.json(
        { error: `Bridge falhou (${e.status})` },
        { status: 502 },
      );
    }
    console.error("[/api/admin/online]", e);
    return NextResponse.json(
      { error: "Erro de rede com a bridge" },
      { status: 502 },
    );
  }
}
