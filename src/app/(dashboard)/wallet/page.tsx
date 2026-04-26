import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { WalletPanel } from "@/components/dashboard/WalletPanel";

export default async function WalletPage() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { coins: true },
  });
  const txs = await prisma.walletTransaction.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      coins: true,
      status: true,
      type: true,
      description: true,
      createdAt: true,
    },
  });
  const coins = user?.coins ?? 0;
  const transactions = txs.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    coins: t.coins,
    status: t.status,
    type: t.type,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <>
      <PageTitle
        title="Saldo"
        subtitle="Recarregue coins via Mercado Pago (PIX, cartão, boleto). 1 coin = R$1."
      />
      <WalletPanel coins={coins} transactions={transactions} />
    </>
  );
}
