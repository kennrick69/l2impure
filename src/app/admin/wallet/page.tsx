import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { WalletAdminPanel } from "@/components/admin/WalletAdminPanel";

export default async function AdminWalletPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    txs,
    totalApproved,
    totalCoinsSold,
    txsToday,
    pendingCount,
  ] = await Promise.all([
    prisma.walletTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.walletTransaction.aggregate({
      where: { status: "approved", type: "recharge" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { status: "approved" },
      _sum: { coins: true },
    }),
    prisma.walletTransaction.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.walletTransaction.count({ where: { status: "pending" } }),
  ]);

  const transactions = txs.map((t) => ({
    id: t.id,
    userId: t.userId,
    userEmail: t.user.email,
    amount: Number(t.amount),
    coins: t.coins,
    status: t.status,
    type: t.type,
    description: t.description,
    mpPaymentId: t.mpPaymentId,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalRevenue = totalApproved._sum.amount
    ? Number(totalApproved._sum.amount as Prisma.Decimal)
    : 0;
  const totalCoins = totalCoinsSold._sum.coins ?? 0;

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Carteira (admin)
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Todas as transações, refunds via MP e crédito manual de coins.
      </p>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita aprovada" value={`R$ ${totalRevenue.toFixed(2).replace(".", ",")}`} />
        <Stat label="Coins creditados" value={totalCoins.toLocaleString("pt-BR")} />
        <Stat label="Transações hoje" value={txsToday} />
        <Stat label="Pendentes" value={pendingCount} accent={pendingCount > 0 ? "gold" : undefined} />
      </section>

      <WalletAdminPanel transactions={transactions} />
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "gold";
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
      <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-2xl font-bold ${accent === "gold" ? "text-l2-gold" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}
