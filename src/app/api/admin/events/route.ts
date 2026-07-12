import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/events — lista as configs de evento do gameserver.
 * Usado pra refresh client-side da página /admin/events/config.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_events", clientIp(req), 120, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const events = await prisma.eventConfig.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ events });
}
