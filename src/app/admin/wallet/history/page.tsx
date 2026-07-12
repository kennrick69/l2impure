import { prisma } from "@/lib/db";
import {
  WalletHistoryPanel,
  type WalletTxRow,
} from "@/components/admin/WalletHistoryPanel";

export const dynamic = "force-dynamic";

/**
 * /admin/wallet/history — histórico completo de WalletTransactions com
 * filtros server-side (data, status, user, valor) + refund idempotente.
 * SSR entrega a primeira página; filtros/paginação vão pela API.
 */
export default async function AdminWalletHistoryPage() {
  const [total, txs] = await Promise.all([
    prisma.walletTransaction.count(),
    prisma.walletTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, email: true, coins: true } } },
    }),
  ]);

  const transactions: WalletTxRow[] = txs.map((t) => ({
    id: t.id,
    userId: t.userId,
    userEmail: t.user.email,
    userCoins: t.user.coins,
    amount: Number(t.amount),
    coins: t.coins,
    status: t.status,
    type: t.type,
    description: t.description,
    mpPaymentId: t.mpPaymentId,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Wallet — histórico
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Todas as transações da carteira, filtráveis por período, status,
        user e valor. Refund (MP + débito de coins) exige PIN GM e é
        idempotente — disparo repetido nunca debita em dobro.
      </p>
      <WalletHistoryPanel initial={{ transactions, total, offset: 0 }} />
    </>
  );
}
