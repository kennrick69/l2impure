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
  const codeId = Number(id);
  if (!Number.isFinite(codeId) || codeId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Desativa setando expiresAt = agora
  const updated = await prisma.promoCode
    .update({
      where: { id: codeId },
      data: { expiresAt: new Date() },
      select: { id: true, code: true },
    })
    .catch(() => null);
  if (!updated) {
    return NextResponse.json({ error: "Código não encontrado" }, { status: 404 });
  }

  await audit({
    userId: admin.userId,
    action: "admin_deactivate_promo_code",
    ipAddress: clientIp(req),
    details: { code: updated.code },
  });
  return NextResponse.json({ ok: true });
}
