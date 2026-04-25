import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeVerificationToken, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const result = await consumeVerificationToken(body.token, "reset");
  if (!result) {
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(body.password);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  // Invalida todos os refresh tokens existentes desse usuário
  // (força re-login em todos os devices).
  await prisma.refreshToken.updateMany({
    where: { userId: result.userId, revoked: false },
    data: { revoked: true },
  });

  await audit({
    userId: result.userId,
    action: "reset_password",
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true });
}
