import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/vote-sites/[slug] — config pública de um site de voto.
 * Consumido pela bridge (VPS) antes de processar callbacks, com cache
 * local de 5min lá. Sem auth — só campos não sensíveis. Cache CDN 60s.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,32}$/.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const site = await prisma.voteSite.findUnique({
    where: { slug },
    select: {
      slug: true,
      active: true,
      cooldownHours: true,
      rewardCoins: true,
      rewardDescription: true,
    },
  });

  if (!site) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(site, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
