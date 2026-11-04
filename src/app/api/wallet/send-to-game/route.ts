import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { bridgeFetch, BridgeError } from "@/lib/bridge";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/**
 * POST /api/wallet/send-to-game  { charName, tol }
 *
 * Debita `tol` do saldo do painel e entrega `tol * (1 + bônus%)` de TOL
 * (item 9503) ao personagem, online ou offline, via a fila GM (give_item
 * no gameserver). Débito atômico; se a fila falhar, estorna.
 */

const TOL_ITEM_ID = 9503;
const MIN_SEND = 1;
const MAX_SEND = 1_000_000;

// Envio ao jogo é 1:1 — o bônus é aplicado NA COMPRA (create-preference),
// não aqui. O personagem recebe exatamente o TOL enviado.

const Body = z
  .object({
    charName: z.string().trim().min(1).max(35),
    tol: z.coerce.number().int().min(MIN_SEND).max(MAX_SEND),
  })
  .strict();

export async function POST(req: Request) {
  let session: { sub: number; email: string };
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("send_to_game", String(session.sub), 20, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas, aguarde um pouco." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // 1. O personagem pertence a uma das contas de jogo do usuário?
  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.sub },
    select: { gameLogin: true },
  });
  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Você não tem contas de jogo." },
      { status: 400 },
    );
  }
  let owns = false;
  for (const a of accounts) {
    try {
      const data = await bridgeFetch<{ characters: { name: string }[] }>(
        "GET",
        `/characters/${encodeURIComponent(a.gameLogin)}`,
      );
      if (
        data.characters.some(
          (c) => c.name.toLowerCase() === body.charName.toLowerCase(),
        )
      ) {
        owns = true;
        break;
      }
    } catch {
      /* bridge fora numa conta — tenta as próximas */
    }
  }
  if (!owns) {
    return NextResponse.json(
      { error: "Personagem não encontrado nas suas contas." },
      { status: 400 },
    );
  }

  const delivered = body.tol; // 1:1, sem bônus no envio

  // 2. Débito atômico (coins -= tol) + transação pendente.
  let txId: number;
  try {
    txId = await prisma.$transaction(async (db) => {
      const u = await db.user.findUnique({
        where: { id: session.sub },
        select: { coins: true },
      });
      if (!u || u.coins < body.tol) throw new Error("SALDO");
      await db.user.update({
        where: { id: session.sub },
        data: { coins: { decrement: body.tol } },
      });
      const tx = await db.walletTransaction.create({
        data: {
          userId: session.sub,
          amount: 0,
          coins: -body.tol,
          status: "pending",
          type: "send_to_game",
          description: `Enviar ${body.tol} TOL para ${body.charName}`,
        },
        select: { id: true },
      });
      return tx.id;
    });
  } catch (e) {
    if ((e as Error).message === "SALDO") {
      return NextResponse.json(
        { error: "Saldo de TOL insuficiente." },
        { status: 400 },
      );
    }
    throw e;
  }

  // 3. Enfileira a entrega (give_item online/offline). Falha → estorna.
  try {
    await bridgeFetch("POST", "/gm-commands", {
      type: "give_item",
      payload: {
        charName: body.charName,
        itemId: TOL_ITEM_ID,
        count: delivered,
      },
      requestedBy: `player:${session.email}`,
      priority: 0,
    });
  } catch (e) {
    await prisma
      .$transaction(async (db) => {
        await db.user.update({
          where: { id: session.sub },
          data: { coins: { increment: body.tol } },
        });
        await db.walletTransaction.update({
          where: { id: txId },
          data: { status: "rejected" },
        });
      })
      .catch(() => {});
    if (e instanceof BridgeError) {
      return NextResponse.json(
        { error: "Servidor de jogo indisponível. Tente novamente." },
        { status: 502 },
      );
    }
    throw e;
  }

  await prisma.walletTransaction
    .update({ where: { id: txId }, data: { status: "approved" } })
    .catch(() => {});

  await audit({
    userId: session.sub,
    action: "wallet_send_to_game",
    ipAddress: clientIp(req),
    details: { charName: body.charName, tol: body.tol, delivered },
  }).catch(() => {});

  return NextResponse.json({ ok: true, delivered });
}
