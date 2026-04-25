import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/debug/user?key=<DEBUG_KEY>&email=<email>
 * Retorna status do user (verificado, criado quando, tokens pendentes,
 * últimos eventos do audit log). Read-only.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const email = url.searchParams.get("email")?.toLowerCase();
  const expected = process.env.DEBUG_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "DEBUG_KEY env não setada" },
      { status: 503 },
    );
  }
  if (key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!email) {
    return NextResponse.json(
      { error: "Falta query string ?email=<email>" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ found: false, email });
  }

  const [verificationTokens, refreshTokensCount, recentAudit] =
    await Promise.all([
      prisma.verificationToken.findMany({
        where: { userId: user.id },
        select: {
          type: true,
          used: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.refreshToken.count({
        where: { userId: user.id, revoked: false },
      }),
      prisma.auditLog.findMany({
        where: { userId: user.id },
        select: {
          action: true,
          ipAddress: true,
          createdAt: true,
          details: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    found: true,
    user,
    activeRefreshTokens: refreshTokensCount,
    recentVerificationTokens: verificationTokens.map((t) => ({
      ...t,
      isExpired: t.expiresAt.getTime() < Date.now(),
    })),
    recentAudit,
  });
}
