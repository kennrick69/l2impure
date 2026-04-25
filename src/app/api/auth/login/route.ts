import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  signAccessToken,
  createAndStoreRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  const rl = await rateLimit(
    "login",
    ip,
    rateLimits.login.max,
    rateLimits.login.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 1 minuto." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    await audit({
      action: "login_fail_no_user",
      ipAddress: ip,
      details: { email: body.email },
    });
    return NextResponse.json(
      { error: "Email ou senha incorretos" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    await audit({
      userId: user.id,
      action: "login_fail_wrong_password",
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Email ou senha incorretos" },
      { status: 401 },
    );
  }

  if (!user.isVerified) {
    return NextResponse.json(
      { error: "Confirme seu email antes de entrar", code: "unverified" },
      { status: 403 },
    );
  }

  if (user.bannedAt) {
    await audit({
      userId: user.id,
      action: "login_fail_banned",
      ipAddress: ip,
    });
    return NextResponse.json(
      {
        error:
          "Esta conta está suspensa. Entre em contato com o suporte se acha que foi engano.",
        code: "banned",
      },
      { status: 403 },
    );
  }

  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const { token: refreshToken, expiresAt } = await createAndStoreRefreshToken(
    user.id,
  );
  await setAuthCookies({
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
  });

  await audit({ userId: user.id, action: "login", ipAddress: ip });

  return NextResponse.json({
    user: { id: user.id, email: user.email },
  });
}
