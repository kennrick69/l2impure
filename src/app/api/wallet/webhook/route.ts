import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mp } from "@/lib/mercadopago";
import { audit } from "@/lib/audit";

/**
 * Webhook do Mercado Pago. Sem auth (MP chama direto).
 *
 * MP envia em vários formatos — verificamos body { type: "payment", data: {id} },
 * body { action: "payment.created/updated", data: {id} } e query string
 * (?id=X&topic=payment OR ?data.id=X&type=payment).
 *
 * Sempre responde 200 (mesmo em erro) pra MP não ficar reexecutando. Logs
 * registram falhas.
 */
function extractPaymentId(
  body: Record<string, unknown>,
  url: URL,
): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  const type = body.type;
  const action = body.action;
  if ((type === "payment" || (typeof action === "string" && action.startsWith("payment."))) && data?.id) {
    return String(data.id);
  }
  const queryId =
    url.searchParams.get("id") ?? url.searchParams.get("data.id");
  const queryTopic =
    url.searchParams.get("topic") ?? url.searchParams.get("type");
  if (queryTopic === "payment" && queryId) return queryId;
  return null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    /* keep body = {} */
  }
  const url = new URL(req.url);
  const paymentId = extractPaymentId(body, url);

  // Validação de assinatura — só rejeita se secret está configurado e bate negativo
  const sigCheck = mp.validateWebhookSignature(req.headers, paymentId);
  if (!sigCheck.valid) {
    console.warn(
      `[wallet/webhook] assinatura inválida (${sigCheck.reason}), payment=${paymentId}`,
    );
    // Ainda assim retorna 200 — MP não precisa saber se rejeitamos
    return NextResponse.json({ received: true, ignored: "signature" });
  }

  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: "no-payment-id" });
  }

  if (!mp.isConfigured()) {
    console.warn("[wallet/webhook] MP não configurado — ignorando");
    return NextResponse.json({ received: true, ignored: "mp-not-configured" });
  }

  try {
    const payment = await mp.getPayment(paymentId);
    if (!payment.externalReference) {
      console.warn(
        `[wallet/webhook] payment ${paymentId} sem external_reference — ignorando`,
      );
      return NextResponse.json({ received: true, ignored: "no-external-ref" });
    }

    // Formato esperado: wallet-{userId}-{txId}
    const m = payment.externalReference.match(/^wallet-(\d+)-(\d+)$/);
    if (!m) {
      console.warn(
        `[wallet/webhook] external_reference fora do padrão: ${payment.externalReference}`,
      );
      return NextResponse.json({ received: true, ignored: "ref-mismatch" });
    }
    const userId = Number(m[1]);
    const txId = Number(m[2]);

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: txId },
      select: { id: true, userId: true, status: true, coins: true, amount: true },
    });
    if (!tx || tx.userId !== userId) {
      console.warn(
        `[wallet/webhook] tx ${txId} não bate com user ${userId}`,
      );
      return NextResponse.json({ received: true, ignored: "tx-mismatch" });
    }

    // Idempotência: já processado, não reaplica
    if (tx.status === "approved" && payment.status === "approved") {
      return NextResponse.json({ received: true, already: "approved" });
    }

    if (payment.status === "approved") {
      // Atomic (all-or-nothing): flip status pendente→aprovado E credita coins
      // dentro da MESMA transação. O updateMany continua sendo a trava
      // anti-double-credit (só um webhook concorrente pega count===1); o
      // $transaction garante que status-aprovado e crédito de coins nunca
      // divergem — sem esse wrap, um crash entre os dois statements deixaria a
      // tx "approved" mas sem coins creditados (perda de coins pro jogador).
      const credited = await prisma.$transaction(async (txdb) => {
        const updated = await txdb.walletTransaction.updateMany({
          where: { id: txId, status: { not: "approved" } },
          data: {
            status: "approved",
            mpPaymentId: paymentId,
          },
        });
        if (updated.count !== 1) return false;
        await txdb.user.update({
          where: { id: userId },
          data: { coins: { increment: tx.coins } },
        });
        return true;
      });
      if (credited) {
        await audit({
          userId,
          action: "wallet_recharge_approved",
          details: {
            txId,
            paymentId,
            coins: tx.coins,
            amount: tx.amount.toString(),
          },
        });
      }
      return NextResponse.json({ received: true, applied: true });
    }

    if (
      payment.status === "rejected" ||
      payment.status === "cancelled" ||
      payment.status === "refunded"
    ) {
      await prisma.walletTransaction.updateMany({
        where: { id: txId, status: "pending" },
        data: {
          status: payment.status,
          mpPaymentId: paymentId,
        },
      });
      await audit({
        userId,
        action: `wallet_recharge_${payment.status}`,
        details: { txId, paymentId },
      });
      return NextResponse.json({ received: true, status: payment.status });
    }

    // Outros estados (in_process, pending) — só guarda payment_id
    await prisma.walletTransaction.update({
      where: { id: txId },
      data: { mpPaymentId: paymentId, status: payment.status },
    });
    return NextResponse.json({ received: true, status: payment.status });
  } catch (e) {
    console.error(
      `[wallet/webhook] erro processando paymentId=${paymentId}:`,
      (e as Error).message,
    );
    return NextResponse.json({ received: true, error: "processing-failed" });
  }
}

// Health check pro MP poder testar GET no endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "L2 Impure wallet webhook" });
}
