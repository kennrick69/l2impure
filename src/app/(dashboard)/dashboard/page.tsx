import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bridge } from "@/lib/bridge";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { CreateAccountTrigger } from "@/components/dashboard/CreateAccountTrigger";
import { AccountRowActions } from "@/components/dashboard/AccountRowActions";
import { ResetHwidButton } from "@/components/dashboard/ResetHwidButton";
import type { SVGProps } from "react";
import {
  HeadsetIcon,
  CoinsIcon,
  SendIcon,
  SwordsIcon,
  PlusIcon,
  ArrowUpRightIcon,
} from "@/components/icons";

type IconType = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const MAX_ACCOUNTS = 15;

/** epoch ms → "dd-mm-aaaa hh:mm" (pt-BR), ou "—" se nunca logou. */
function fmtLast(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AccRow = {
  id: number;
  gameLogin: string;
  createdAt: Date;
  /** null = bridge fora (não deu pra consultar) */
  charCount: number | null;
  online: boolean;
  lastActive: number;
  banned: boolean;
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [accounts, user] = await Promise.all([
    prisma.gameAccount.findMany({
      where: { userId: session.sub },
      select: { id: true, gameLogin: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { coins: true },
    }),
  ]);
  const balance = user?.coins ?? 0;

  // Uma chamada por conta → count + status online + último login + ban.
  // Fail-soft: bridge fora numa conta → charCount null (mostra "—").
  const rows: AccRow[] = await Promise.all(
    accounts.map(async (acc): Promise<AccRow> => {
      try {
        const data = await bridge.getCharacters(acc.gameLogin);
        return {
          id: acc.id,
          gameLogin: acc.gameLogin,
          createdAt: acc.createdAt,
          charCount: data.count ?? data.characters.length,
          online: data.characters.some((c) => c.online),
          lastActive: data.lastActive ?? 0,
          banned: Boolean(data.banned),
        };
      } catch (e) {
        console.warn(
          `[dashboard] bridge.getCharacters(${acc.gameLogin}) falhou:`,
          (e as Error).message,
        );
        return {
          id: acc.id,
          gameLogin: acc.gameLogin,
          createdAt: acc.createdAt,
          charCount: null,
          online: false,
          lastActive: 0,
          banned: false,
        };
      }
    }),
  );

  const totalChars = rows.reduce((a, r) => a + (r.charCount ?? 0), 0);
  const anyBridgeOk = rows.some((r) => r.charCount !== null);
  const totalCharsLabel = rows.length === 0 ? "0" : anyBridgeOk ? String(totalChars) : "—";

  return (
    <>
      <PageTitle
        title="Contas do Jogo"
        subtitle={`Logado como ${session.email}`}
      />

      {/* 3 cards de topo (card inteiro clicável + glow no hover) */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Saldo (TOL)"
          Icon={CoinsIcon}
          value={String(balance)}
          accent="gold"
          href="/wallet"
          action="Comprar / recarregar"
        />
        <StatCard
          title="Enviar ao jogo"
          Icon={SendIcon}
          value={<span className="text-xl font-semibold text-white/80">Mandar TOL</span>}
          href="/wallet"
          action="Enviar para um personagem"
        />
        <StatCard
          title="Personagens"
          Icon={SwordsIcon}
          value={totalCharsLabel}
          href="/characters"
          action="Gerenciar personagens"
        />
      </section>

      <section className="l2-panel mb-8">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Contas do Jogo{" "}
            <span className="text-white/40">
              {accounts.length}/{MAX_ACCOUNTS}
            </span>
          </h3>
          <CreateAccountTrigger variant="primary">
            <PlusIcon className="h-4 w-4" />
            <span>Criar conta</span>
          </CreateAccountTrigger>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <SwordsIcon className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="mb-1 text-sm text-white/65">
              Você ainda não tem contas de jogo
            </p>
            <p className="mb-5 text-xs text-white/45">
              Crie sua conta e já pode logar no servidor.
            </p>
            <CreateAccountTrigger variant="primary">
              <PlusIcon className="h-4 w-4" />
              <span>Criar primeira conta</span>
            </CreateAccountTrigger>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Login</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Último login</th>
                    <th className="px-5 py-3 text-left">Personagens</th>
                    <th className="px-5 py-3 text-left">Criada em</th>
                    <th className="px-5 py-3 text-left">HWID</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((acc, i) => (
                    <tr
                      key={acc.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/3"
                    >
                      <td className="px-5 py-3 text-white/45">{i + 1}</td>
                      <td className="px-5 py-3">
                        <span className="font-display font-semibold uppercase text-white">
                          {acc.gameLogin}
                        </span>
                        {acc.banned && (
                          <span className="ml-2 rounded bg-l2-red/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-l2-red">
                            Banida
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {acc.online ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-l2-green">
                            <span className="h-1.5 w-1.5 rounded-full bg-l2-green" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-white/55">
                        {fmtLast(acc.lastActive)}
                      </td>
                      <td className="px-5 py-3">
                        {acc.charCount === null ? (
                          <span className="text-xs text-white/40">—</span>
                        ) : acc.charCount === 0 ? (
                          <span className="text-xs text-white/40">0</span>
                        ) : (
                          <Link
                            href={`/characters?login=${encodeURIComponent(acc.gameLogin)}`}
                            className="text-xs font-semibold text-l2-green transition hover:underline"
                          >
                            {acc.charCount}{" "}
                            {acc.charCount === 1 ? "personagem" : "personagens"}
                          </Link>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-white/55">
                        {acc.createdAt.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <ResetHwidButton gameLogin={acc.gameLogin} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <AccountRowActions gameLogin={acc.gameLogin} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-white/5 px-6 py-3 text-[11px] text-white/40">
              Mostrando {rows.length} de {rows.length}{" "}
              {rows.length === 1 ? "conta" : "contas"}
            </div>
          </>
        )}
      </section>

      <section className="l2-panel flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-l2-gold/10 text-l2-gold">
          <HeadsetIcon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Precisa de ajuda?
          </h4>
          <p className="mt-1 text-xs text-white/55">
            Faça uma pergunta ou relate problemas. Nossa equipe entra em contato
            o mais breve possível.
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
  Icon,
  value,
  accent,
  href,
  action,
}: {
  title: string;
  Icon: IconType;
  value: React.ReactNode;
  accent?: "gold";
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="l2-panel group flex flex-col p-5 transition"
    >
      <div className="mb-3 flex items-center">
        <span className="font-display text-xs font-semibold uppercase tracking-wider text-white/55">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            accent === "gold"
              ? "bg-[color:var(--l2-gold)]/10 text-[color:var(--l2-text-gold)]"
              : "bg-white/5 text-white/70"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {typeof value === "string" ? (
          <span
            className={
              accent === "gold"
                ? "font-display text-3xl font-bold leading-none text-[color:var(--l2-text-gold)]"
                : "font-display text-3xl font-bold leading-none text-white"
            }
          >
            {value}
          </span>
        ) : (
          value
        )}
      </div>
      <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-xs text-white/55 transition group-hover:text-white">
        <span>{action}</span>
        <ArrowUpRightIcon className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
