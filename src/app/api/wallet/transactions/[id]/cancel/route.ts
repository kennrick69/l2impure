import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

/**
 * POST /api/wallet/transactions/:id/cancel
 *
 * Marca uma tx pendente como cancelled. Só permite se:
 *  - tx pertence ao user logado
 *  - status = pending
 *  - mp_payment_id é null (nunca foi até o checkout MP)
 *
 * Sem chamada ao MP — a preferência abandona naturalmente lá.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id: raw } = await params;
  const txId = Number(raw);
  if (!Number.isFinite(txId) || txId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Atomic: só atualiza se ainda for pending+sem-payment+do-user
  const result = await prisma.walletTransaction.updateMany({
    where: {
      id: txId,
      userId: session.sub,
      status: "pending",
      mpPaymentId: null,
    },
    data: { status: "cancelled" },
  });
  if (result.count === 0) {
    return NextResponse.json(
      {
        error:
          "Não é possível cancelar — tx não existe, já foi paga ou já tem status final",
      },
      { status: 409 },
    );
  }

  await audit({
    userId: session.sub,
    action: "wallet_user_cancel_pending",
    ipAddress: clientIp(req),
    details: { txId },
  });
  return NextResponse.json({ ok: true });
}
