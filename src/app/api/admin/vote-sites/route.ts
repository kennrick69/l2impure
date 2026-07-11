import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/vote-sites — lista todos os rankings de voto.
 * Usado pela página /admin/marketing/vote-sites.
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

  const rl = await rateLimit("admin_vote_sites", clientIp(req), 120, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const sites = await prisma.voteSite.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ sites });
}
