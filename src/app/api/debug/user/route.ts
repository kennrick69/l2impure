import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertDebugAccess } from "@/lib/debug-auth";

/**
 * GET /api/debug/user?key=<DEBUG_KEY>&email=<email>
 * Retorna status do user (verificado, criado quando, tokens pendentes,
 * últimos eventos do audit log). Read-only.
 */
export async function GET(req: Request) {
  const guard = assertDebugAccess(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.toLowerCase();
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

/**
 * DELETE /api/debug/user?key=<DEBUG_KEY>&email=<email>&confirm=DELETE_USER
 * Apaga o user. Cascade FK derruba refresh_tokens, verification_tokens,
 * game_accounts. Audit log fica com user_id=null (preserva histórico).
 *
 * Exige ?confirm=DELETE_USER pra evitar accidentes — sem isso retorna 400.
 */
export async function DELETE(req: Request) {
  const guard = assertDebugAccess(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.toLowerCase();
  const confirm = url.searchParams.get("confirm");

  if (!email) {
    return NextResponse.json(
      { error: "Falta query string ?email=<email>" },
      { status: 400 },
    );
  }
  if (confirm !== "DELETE_USER") {
    return NextResponse.json(
      {
        error:
          "Confirmação obrigatória — adicione &confirm=DELETE_USER ao querystring",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ ok: true, deleted: false, reason: "not_found" });
  }

  const deleted = await prisma.user.delete({
    where: { id: user.id },
    select: { id: true, email: true },
  });
  return NextResponse.json({
    ok: true,
    deleted: true,
    user: deleted,
    note: "Audit log preservado com user_id=null",
  });
}
