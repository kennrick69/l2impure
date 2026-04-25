import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { createVerificationToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const { token } = await createVerificationToken(user.id, "reset", 60);
  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (e) {
    console.error("[admin reset-password] sendPasswordResetEmail falhou:", e);
    return NextResponse.json(
      { error: "Falha ao enviar email" },
      { status: 502 },
    );
  }

  await audit({
    userId: admin.userId,
    action: "admin_reset_password",
    ipAddress: clientIp(req),
    details: { targetUserId: userId, targetEmail: user.email },
  });
  return NextResponse.json({ ok: true });
}
