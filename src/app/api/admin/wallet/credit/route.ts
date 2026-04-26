import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  coins: z.coerce.number().int().min(-100000).max(100000),
  reason: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  if (body.coins === 0) {
    return NextResponse.json({ error: "coins não pode ser 0" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, coins: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  if (body.coins < 0 && target.coins + body.coins < 0) {
    return NextResponse.json(
      { error: `Saldo insuficiente — atual ${target.coins}, débito ${Math.abs(body.coins)}` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { coins: { increment: body.coins } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: target.id,
        amount: 0,
        coins: body.coins,
        status: "approved",
        type: "admin_credit",
        description: body.reason
          ? `Admin: ${body.reason}`
          : `Crédito admin (${admin.email})`,
      },
    }),
  ]);

  await audit({
    userId: admin.userId,
    action: "wallet_admin_credit",
    ipAddress: clientIp(req),
    details: {
      targetEmail: body.email,
      targetUserId: target.id,
      coins: body.coins,
      reason: body.reason,
    },
  });

  return NextResponse.json({ ok: true });
}
