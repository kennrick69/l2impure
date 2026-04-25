import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { CreateAccountTrigger } from "@/components/dashboard/CreateAccountTrigger";
import { AccountRowActions } from "@/components/dashboard/AccountRowActions";
import { HeadsetIcon } from "@/components/icons";

const MAX_ACCOUNTS = 15;

export default async function DashboardPage() {
  const session = await getSession();
  // Layout já garante session ≠ null, mas TS precisa do narrowing
  if (!session) return null;

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.sub },
    select: { id: true, gameLogin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageTitle
        title="Página principal"
        subtitle={`Logado como ${session.email}`}
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Saldo"
          icon="🪙"
          value="0"
          accent="gold"
          footer={
            <Link
              href="/wallet"
              className="text-xs text-white/55 transition hover:text-white"
            >
              💸 Transferir / recarregar →
            </Link>
          }
        />
        <StatCard
          title="Armazém"
          icon="📦"
          value="0"
          footer={
            <Link
              href="/warehouse"
              className="text-xs text-white/55 transition hover:text-white"
            >
              Ver itens armazenados →
            </Link>
          }
        />
        <StatCard
          title="Personagens"
          icon="⚔️"
          value="0"
          footer={
            <Link
              href="/characters"
              className="text-xs text-white/55 transition hover:text-white"
            >
              Gerenciar personagens →
            </Link>
          }
        />
      </section>

      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Contas do Jogo
          </h3>
          <CreateAccountTrigger variant="outline">
            <span>➕</span>
            <span>
              Criar{" "}
              <span className="opacity-60">
                ({accounts.length}/{MAX_ACCOUNTS})
              </span>
            </span>
          </CreateAccountTrigger>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mb-3 text-4xl opacity-30">⚔️</div>
            <p className="mb-1 text-sm text-white/65">
              Você ainda não tem contas de jogo
            </p>
            <p className="mb-5 text-xs text-white/45">
              Reserve seu nome agora — sincronização com o servidor de jogo
              na Fase 3 (bridge VPS).
            </p>
            <CreateAccountTrigger variant="outline">
              <span>➕</span>
              <span>Criar primeira conta</span>
            </CreateAccountTrigger>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Login</th>
                  <th className="px-6 py-3 text-left">Criada em</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, i) => (
                  <tr
                    key={acc.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-3 text-white/45">#{i + 1}</td>
                    <td className="px-6 py-3 font-display font-semibold uppercase text-white">
                      {acc.gameLogin}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {new Date(acc.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-l2-green">
                        <span className="h-1.5 w-1.5 rounded-full bg-l2-green" />
                        Ativa
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <AccountRowActions gameLogin={acc.gameLogin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex items-center gap-4 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-l2-gold/10 text-l2-gold">
          <HeadsetIcon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Precisa de ajuda?
          </h4>
          <p className="mt-1 text-xs text-white/55">
            Faça uma pergunta ou relate problemas. Nossa equipe entra em
            contato o mais breve possível.
          </p>
        </div>
        <Link
          href="/support"
          className="rounded-md border border-white/8 bg-[color:var(--l2-bg-card-hover)] px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white/75 transition hover:border-white/20 hover:text-white"
        >
          Suporte
        </Link>
      </section>
    </>
  );
}

function StatCard({
  title,
  icon,
  value,
  accent,
  footer,
}: {
  title: string;
  icon: string;
  value: string;
  accent?: "gold";
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
          {title}
        </span>
        <span className="text-white/30">⋯</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={
            accent === "gold"
              ? "font-display text-3xl font-bold text-[color:var(--l2-text-gold)]"
              : "font-display text-3xl font-bold text-white"
          }
        >
          {value}
        </span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mt-4 border-t border-white/5 pt-3">{footer}</div>
    </div>
  );
}
