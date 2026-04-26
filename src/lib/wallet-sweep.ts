import { prisma } from "./db";

/**
 * Marca como "cancelled" qualquer tx pendente sem mp_payment_id que tenha
 * mais de 2h. Esses são casos de abandoned-checkout — usuário criou a
 * preferência mas nunca foi até o checkout do MP. Webhook nunca dispara
 * pra esses, então higienizamos localmente.
 *
 * Idempotente. Roda inline no /wallet load — query barata, índice em status.
 */
export async function sweepAbandonedPending(userId: number): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = await prisma.walletTransaction.updateMany({
    where: {
      userId,
      status: "pending",
      mpPaymentId: null,
      createdAt: { lt: cutoff },
    },
    data: { status: "cancelled" },
  });
  return result.count;
}
