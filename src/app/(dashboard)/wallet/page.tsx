import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/dashboard/Placeholder";

export default async function WalletPage() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { coins: true },
  });
  const coins = user?.coins ?? 0;

  return (
    <>
      <PageTitle
        title="Saldo"
        subtitle="Gerencie créditos do painel — transferências entre contas e recargas."
      />

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
              Saldo atual
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-l2-gold">
                {coins}
              </span>
              <span className="mb-1 text-2xl">🪙</span>
            </div>
            <div className="mt-1 text-xs text-white/45">
              {coins === 1 ? "crédito" : "créditos"} do painel L2 Impure
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <DisabledButton icon="💸" label="Transferir" />
            <DisabledButton icon="➕" label="Recarregar" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Histórico
        </h3>
        <p className="text-xs text-white/55">
          Suas transações de saldo aparecem aqui. Recarga e transferência
          chegam em breve.
        </p>
      </section>
    </>
  );
}

function DisabledButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Em breve"
      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white/45"
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-semibold normal-case text-white/55">
        Em breve
      </span>
    </button>
  );
}
