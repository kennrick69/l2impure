import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { bridge, BridgeError } from "@/lib/bridge";

const loginSchema = z
  .string()
  .min(5)
  .max(45)
  .regex(/^[A-Za-z0-9]+$/);

/**
 * POST /api/game/accounts/:login/reset-hwid
 * Limpa o lock por IP (lastIP='') na conta L2J via bridge.
 *
 * Rate-limit 1/semana/conta. Schema do fork não tem coluna `lastHWID`,
 * só `lastIP` é zerada — ainda assim resolve o caso comum de "preso
 * em outra máquina" depois de jogar de outro IP.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ login: string }> },
) {
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
  const { login: rawLogin } = await params;
  const parsedLogin = loginSchema.safeParse(rawLogin);
  if (!parsedLogin.success) {
    return NextResponse.json({ error: "Login inválido" }, { status: 400 });
  }
  const login = parsedLogin.data;

  // Verifica que a conta pertence ao usuário logado (anti-enumeração:
  // mesmo erro se conta não existe ou é de outro user)
  const account = await prisma.gameAccount.findUnique({
    where: { gameLogin: login },
    select: { userId: true },
  });
  if (!account || account.userId !== session.sub) {
    return NextResponse.json(
      { error: "Conta não encontrada" },
      { status: 404 },
    );
  }

  const rl = await rateLimit(
    "resetHwid",
    login,
    rateLimits.resetHwid.max,
    rateLimits.resetHwid.window,
  );
  if (!rl.allowed) {
    const retryAfterSec = Math.max(
      0,
      Math.floor((rl.resetAt - Date.now()) / 1000),
    );
    const days = Math.ceil(retryAfterSec / 86400);
    return NextResponse.json(
      {
        error: `Você já redefiniu o HWID dessa conta recentemente. Tente novamente em ${days} dia${days === 1 ? "" : "s"}.`,
        retryAfter: retryAfterSec,
      },
      { status: 429 },
    );
  }

  try {
    await bridge.resetHwid(login);
  } catch (e) {
    if (e instanceof BridgeError && e.status === 404) {
      return NextResponse.json(
        { error: "Conta não encontrada no servidor de jogo" },
        { status: 404 },
      );
    }
    console.error("[/api/game/accounts/reset-hwid] bridge falhou:", e);
    return NextResponse.json(
      {
        error:
          "Não foi possível redefinir o HWID. Tente novamente em alguns minutos.",
      },
      { status: 502 },
    );
  }

  await audit({
    userId: session.sub,
    action: "reset_hwid",
    ipAddress: ip,
    details: { gameLogin: login },
  });

  return NextResponse.json({ ok: true });
}
