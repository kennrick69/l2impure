import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  if (userId === admin.userId) {
    return NextResponse.json({ error: "Não pode banir você mesmo" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: new Date() },
    select: { id: true, email: true },
  }).catch(() => null);
  if (!updated) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Revoga refresh tokens — kicka de todos devices na próxima refresh
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });

  await audit({
    userId: admin.userId,
    action: "admin_ban_user",
    ipAddress: clientIp(req),
    details: { targetUserId: userId, targetEmail: updated.email },
  });
  return NextResponse.json({ ok: true });
}
