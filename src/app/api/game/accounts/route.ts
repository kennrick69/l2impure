import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { bridge, BridgeError } from "@/lib/bridge";

const MAX_GAME_ACCOUNTS_PER_USER = 15;

const createSchema = z.object({
  gameLogin: z
    .string()
    .min(5)
    .max(16)
    .regex(/^[A-Za-z0-9]+$/, "Apenas letras e números"),
  // Aceita password no body (UI exige), mas NÃO armazena ainda — sync
  // real com o L2J vai depender da bridge VPS (Fase 3).
  password: z.string().min(6).max(32),
});

/**
 * GET /api/game/accounts
 * Lista as contas de jogo do usuário logado.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.sub },
    select: { id: true, gameLogin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    accounts,
    count: accounts.length,
    max: MAX_GAME_ACCOUNTS_PER_USER,
  });
}

/**
 * POST /api/game/accounts
 * Cria conta de jogo: chama bridge.createAccount() (que insere no MySQL
 * L2J com SHA1+Base64) e depois persiste o vínculo no Postgres.
 *
 * Ordem é deliberada: se a bridge falhar, abortamos sem tocar no PG —
 * assim o painel nunca aponta pra uma conta que não existe no jogo.
 *
 * Em dev local sem BRIDGE_URL setada, pula o sync e segue PG-only
 * (BridgeError 503).
 */
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
    "createGameAccount",
    String(session.sub),
    rateLimits.createGameAccount.max,
    rateLimits.createGameAccount.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas criações. Tente novamente em 1 hora." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        details: e instanceof z.ZodError ? e.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  // Verifica limite por user
  const currentCount = await prisma.gameAccount.count({
    where: { userId: session.sub },
  });
  if (currentCount >= MAX_GAME_ACCOUNTS_PER_USER) {
    return NextResponse.json(
      {
        error: `Limite de ${MAX_GAME_ACCOUNTS_PER_USER} contas atingido.`,
      },
      { status: 409 },
    );
  }

  // Verifica unicidade global do login no painel
  const taken = await prisma.gameAccount.findUnique({
    where: { gameLogin: body.gameLogin },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "Esse login já está reservado. Tente outro nome." },
      { status: 409 },
    );
  }

  // Cria no MySQL L2J via bridge ANTES do INSERT no PG.
  // BridgeError 503 = bridge não configurada (dev local) → segue PG-only.
  const bridgeConfigured = Boolean(process.env.BRIDGE_URL);
  if (bridgeConfigured) {
    try {
      await bridge.createAccount(body.gameLogin, body.password);
    } catch (e) {
      if (e instanceof BridgeError && e.status === 409) {
        return NextResponse.json(
          { error: "Esse login já está reservado. Tente outro nome." },
          { status: 409 },
        );
      }
      console.error("[/api/game/accounts] bridge createAccount falhou:", e);
      await audit({
        userId: session.sub,
        action: "create_game_account_bridge_fail",
        ipAddress: ip,
        details: {
          gameLogin: body.gameLogin,
          status: e instanceof BridgeError ? e.status : null,
        },
      });
      return NextResponse.json(
        {
          error:
            "Não foi possível criar a conta no servidor de jogo. Tente novamente em alguns minutos.",
        },
        { status: 502 },
      );
    }
  }

  const account = await prisma.gameAccount.create({
    data: { userId: session.sub, gameLogin: body.gameLogin },
    select: { id: true, gameLogin: true, createdAt: true },
  });

  await audit({
    userId: session.sub,
    action: "create_game_account",
    ipAddress: ip,
    details: { gameLogin: body.gameLogin, bridgeSynced: bridgeConfigured },
  });

  return NextResponse.json(
    {
      ok: true,
      account,
      note: bridgeConfigured
        ? "Conta criada no servidor de jogo e vinculada ao painel."
        : "Reservada no painel (bridge não configurada nesse ambiente).",
    },
    { status: 201 },
  );
}
