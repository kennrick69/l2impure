import { prisma } from "./db";
import { mp, MercadoPagoError } from "./mercadopago";
import { audit } from "./audit";

/**
 * Refund de WalletTransaction — MP + Postgres, idempotente.
 *
 * Fluxo:
 *  1. CAS approved → "refunding" (claim). Disparos concorrentes ou
 *     repetidos NUNCA geram débito dobrado: segundo chamador recebe
 *     already-refunded / in-progress.
 *  2. POST /v1/payments/{id}/refunds no MP. Falha → reverte pra
 *     approved. "already refunded" do MP → segue (o débito local é
 *     que manda a partir daqui).
 *  3. $transaction: debita coins do user (parcial se ele já gastou —
 *     debita só o que resta) + marca refunded.
 *
 * Se o processo morrer entre 1 e 3, a tx fica em "refunding" — nunca
 * some dinheiro sozinho; conferir no painel MP e ajustar via SQL.
 */

export type RefundResult =
  | {
      ok: true;
      alreadyRefunded: false;
      coinsDebited: number;
      partial: boolean;
      coinsExpected: number;
    }
  | { ok: true; alreadyRefunded: true }
  | { ok: false; status: number; error: string };

export async function performWalletRefund(params: {
  txId: number;
  adminUserId: number;
  ipAddress: string | null;
}): Promise<RefundResult> {
  const { txId, adminUserId, ipAddress } = params;

  const tx = await prisma.walletTransaction.findUnique({
    where: { id: txId },
    select: {
      id: true,
      userId: true,
      coins: true,
      amount: true,
      status: true,
      mpPaymentId: true,
    },
  });
  if (!tx) {
    return { ok: false, status: 404, error: "Transação não encontrada" };
  }
  if (tx.status === "refunded") {
    return { ok: true, alreadyRefunded: true };
  }
  if (tx.status === "refunding") {
    return {
      ok: false,
      status: 409,
      error:
        "Refund desta transação já está em andamento (ou travou no meio — conferir painel MP)",
    };
  }
  if (tx.status !== "approved") {
    return {
      ok: false,
      status: 400,
      error: `Só dá pra reembolsar transações aprovadas (status atual: ${tx.status})`,
    };
  }
  if (!tx.mpPaymentId) {
    return {
      ok: false,
      status: 400,
      error: "Sem mp_payment_id — refund manual via painel MP",
    };
  }

  // 1. Claim atômico — perde a corrida quem chegar depois
  const claimed = await prisma.walletTransaction.updateMany({
    where: { id: tx.id, status: "approved" },
    data: { status: "refunding" },
  });
  if (claimed.count === 0) {
    const current = await prisma.walletTransaction.findUnique({
      where: { id: tx.id },
      select: { status: true },
    });
    if (current?.status === "refunded") {
      return { ok: true, alreadyRefunded: true };
    }
    return {
      ok: false,
      status: 409,
      error: "Refund concorrente em andamento",
    };
  }

  // 2. Refund no MP
  try {
    await mp.refund(tx.mpPaymentId, Number(tx.amount));
  } catch (e) {
    const msg = e instanceof MercadoPagoError ? e.message : "Erro de rede com MP";
    // MP já reembolsou antes (ex: refund manual no painel) — o estado
    // local é que está atrasado; segue pro débito de coins.
    const alreadyOnMp = /already.*(refund|been)|refunded/i.test(msg);
    if (!alreadyOnMp) {
      await prisma.walletTransaction.updateMany({
        where: { id: tx.id, status: "refunding" },
        data: { status: "approved" },
      });
      return {
        ok: false,
        status: 502,
        error: `MP refund falhou: ${msg}`,
      };
    }
  }

  // 3. Débito de coins + status final, atômico
  const { coinsDebited, partial } = await prisma.$transaction(async (db) => {
    const user = await db.user.findUnique({
      where: { id: tx.userId },
      select: { coins: true },
    });
    const available = user?.coins ?? 0;
    const debit = Math.min(available, tx.coins);
    if (debit > 0) {
      await db.user.update({
        where: { id: tx.userId },
        data: { coins: { decrement: debit } },
      });
    }
    await db.walletTransaction.update({
      where: { id: tx.id },
      data: { status: "refunded" },
    });
    return { coinsDebited: debit, partial: debit < tx.coins };
  });

  await audit({
    userId: adminUserId,
    action: partial ? "wallet_refund_partial_coins" : "wallet_admin_refund",
    ipAddress,
    details: {
      txId: tx.id,
      mpPaymentId: tx.mpPaymentId,
      amount: tx.amount.toString(),
      coinsExpected: tx.coins,
      coinsDebited,
      partial,
      targetUserId: tx.userId,
    },
  });

  return {
    ok: true,
    alreadyRefunded: false,
    coinsDebited,
    partial,
    coinsExpected: tx.coins,
  };
}
