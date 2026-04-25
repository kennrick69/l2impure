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
 * DELETE /api/game/accounts/:login
 * Apaga a conta no L2J (via bridge — bloqueia se há char online)
 * e remove a linha em game_accounts do Postgres.
 */
export async function DELETE(
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

  const account = await prisma.gameAccount.findUnique({
    where: { gameLogin: login },
    select: { id: true, userId: true },
  });
  if (!account || account.userId !== session.sub) {
    return NextResponse.json(
      { error: "Conta não encontrada" },
      { status: 404 },
    );
  }

  const rl = await rateLimit(
    "default",
    `delgame:${session.sub}`,
    rateLimits.default.max,
    rateLimits.default.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns segundos." },
      { status: 429 },
    );
  }

  // Deleta no L2J primeiro (mais arriscado). Se passar, remove do PG.
  try {
    await bridge.deleteAccount(login);
  } catch (e) {
    if (e instanceof BridgeError) {
      if (e.status === 409) {
        return NextResponse.json(
          {
            error:
              "Existe um personagem online nessa conta. Saia do jogo e tente novamente.",
          },
          { status: 409 },
        );
      }
      if (e.status === 404) {
        // Conta não existe no L2J — remove só do PG pra reconciliar
        await prisma.gameAccount.delete({ where: { id: account.id } });
        await audit({
          userId: session.sub,
          action: "delete_game_account_pg_only",
          ipAddress: ip,
          details: { gameLogin: login },
        });
        return NextResponse.json({ ok: true, note: "removido apenas do painel" });
      }
    }
    console.error("[/api/game/accounts DELETE] bridge falhou:", e);
    return NextResponse.json(
      {
        error: "Não foi possível excluir a conta agora. Tente em instantes.",
      },
      { status: 502 },
    );
  }

  await prisma.gameAccount.delete({ where: { id: account.id } });

  await audit({
    userId: session.sub,
    action: "delete_game_account",
    ipAddress: ip,
    details: { gameLogin: login },
  });

  return NextResponse.json({ ok: true });
}
