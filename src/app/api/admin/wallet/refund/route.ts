import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mp, MercadoPagoError } from "@/lib/mercadopago";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

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

  const body = (await req.json().catch(() => ({}))) as { transactionId?: number };
  const txId = Number(body.transactionId);
  if (!Number.isFinite(txId) || txId <= 0) {
    return NextResponse.json(
      { error: "transactionId inválido" },
      { status: 400 },
    );
  }

  const tx = await prisma.walletTransaction.findUnique({
    where: { id: txId },
    select: {
      id: true,
      userId: true,
      coins: true,
      amount: true,
      status: true,
      mpPaymentId: true,
      type: true,
    },
  });
  if (!tx) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
  }
  if (tx.status !== "approved") {
    return NextResponse.json(
      { error: "Só dá pra reembolsar transações aprovadas" },
      { status: 400 },
    );
  }
  if (!tx.mpPaymentId) {
    return NextResponse.json(
      { error: "Sem mp_payment_id — refund manual via SQL/MP painel" },
      { status: 400 },
    );
  }

  // 1. Refund no MP
  try {
    await mp.refund(tx.mpPaymentId, Number(tx.amount));
  } catch (e) {
    if (e instanceof MercadoPagoError) {
      return NextResponse.json(
        { error: `MP refund falhou: ${e.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Erro de rede com MP" },
      { status: 502 },
    );
  }

  // 2. Atomic: marca refunded + debita coins
  await prisma.$transaction([
    prisma.walletTransaction.update({
      where: { id: tx.id },
      data: { status: "refunded" },
    }),
    prisma.user.update({
      where: { id: tx.userId },
      data: { coins: { decrement: tx.coins } },
    }),
  ]);

  await audit({
    userId: admin.userId,
    action: "wallet_admin_refund",
    ipAddress: clientIp(req),
    details: {
      txId,
      mpPaymentId: tx.mpPaymentId,
      coins: tx.coins,
      amount: tx.amount.toString(),
      targetUserId: tx.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
