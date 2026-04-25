import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  requireSession,
  AuthError,
  REFRESH_COOKIE,
} from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const ip = clientIp(req);
  const rl = await rateLimit(
    "changePassword",
    String(session.sub),
    rateLimits.changePassword.max,
    rateLimits.changePassword.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 1 hora." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "A nova senha precisa ser diferente da atual" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 },
    );
  }

  const ok = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!ok) {
    await audit({
      userId: user.id,
      action: "change_password_fail_wrong_current",
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Senha atual incorreta" },
      { status: 401 },
    );
  }

  const passwordHash = await hashPassword(body.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Revoga refresh tokens de outros devices, mantém o atual ativo pra
  // não kickar o usuário do device onde ele acabou de trocar a senha.
  const store = await cookies();
  const currentRefresh = store.get(REFRESH_COOKIE)?.value ?? "";
  await prisma.refreshToken.updateMany({
    where: {
      userId: user.id,
      revoked: false,
      NOT: { token: currentRefresh },
    },
    data: { revoked: true },
  });

  await audit({
    userId: user.id,
    action: "change_password",
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true });
}
