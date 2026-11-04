import Link from "next/link";
import type { SVGProps, ReactElement } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bridge, type GameCharacter } from "@/lib/bridge";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { CreateAccountTrigger } from "@/components/dashboard/CreateAccountTrigger";
import { SwordsIcon, PlusIcon, ArrowUpRightIcon } from "@/components/icons";

type IconType = (props: SVGProps<SVGSVGElement>) => ReactElement;

type Row = GameCharacter & { account: string; banned: boolean };

/** segundos → "Xh Ym" (tempo jogado). */
function fmtGameTime(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** epoch ms → "dd-mm-aaaa hh:mm", ou "—". */
function fmtLastChar(ms: number): string {
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

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const filterLogin =
    params.login && /^[A-Za-z0-9]{4,45}$/.test(params.login)
      ? params.login
      : undefined;

  const accountsQuery = await prisma.gameAccount.findMany({
    where: {
      userId: session.sub,
      ...(filterLogin ? { gameLogin: filterLogin } : {}),
    },
    select: { gameLogin: true },
    orderBy: { createdAt: "asc" },
  });
  const accounts = accountsQuery;

  const all: Row[] = [];
  let bridgeFailed = false;

  if (accounts.length > 0) {
    const results = await Promise.all(
      accounts.map(async (acc) => {
        try {
          const data = await bridge.getCharacters(acc.gameLogin);
          return data.characters.map(
            (c): Row => ({
              ...c,
              account: acc.gameLogin,
              banned: Boolean(data.banned),
            }),
          );
        } catch (e) {
          console.warn(
            `[characters] bridge.getCharacters(${acc.gameLogin}) falhou:`,
            (e as Error).message,
          );
          bridgeFailed = true;
          return [] as Row[];
        }
      }),
    );
    for (const list of results) all.push(...list);
  }

  // Online primeiro, depois por level desc, depois nome
  all.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    if (b.level !== a.level) return b.level - a.level;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <PageTitle
        title="Meus personagens"
        subtitle={`Personagens das suas contas de jogo.${
          bridgeFailed ? " Algumas contas não puderam ser carregadas." : ""
        }`}
      />

      {filterLogin && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-white/8 bg-[color:var(--l2-bg-card)] px-4 py-3 text-sm">
          <span className="text-white/65">
            Filtrando por conta:{" "}
            <strong className="font-display uppercase text-l2-gold">
              {filterLogin}
            </strong>
          </span>
          <Link
            href="/characters"
            className="group inline-flex shrink-0 items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)] transition hover:brightness-110"
          >
            <span>Ver todas</span>
            <ArrowUpRightIcon className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          Icon={SwordsIcon}
          title="Você ainda não tem contas de jogo"
          description="Crie sua primeira conta de jogo e entre no servidor pra começar a criar personagens."
          cta
        />
      ) : all.length === 0 ? (
        <EmptyState
          Icon={SwordsIcon}
          title="Nenhum personagem encontrado"
          description="Crie uma conta e entre no jogo!"
        />
      ) : (
        <CharactersTable rows={all} />
      )}
    </>
  );
}

function CharactersTable({ rows }: { rows: Row[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">Classe</th>
              <th className="px-6 py-3 text-left">Lv</th>
              <th className="px-6 py-3 text-left">Clan</th>
              <th className="px-6 py-3 text-right">PvP</th>
              <th className="px-6 py-3 text-right">PK</th>
              <th className="px-6 py-3 text-left">Conta</th>
              <th className="px-6 py-3 text-left">Tempo</th>
              <th className="px-6 py-3 text-left">Último login</th>
              <th className="px-6 py-3 text-left">Ban</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={`${c.account}:${c.name}`}
                className="border-b border-white/5 last:border-0 hover:bg-white/3"
              >
                <td className="px-6 py-3 font-display font-semibold text-white">
                  {c.name}
                </td>
                <td className="px-6 py-3 text-white/75">{c.className}</td>
                <td className="px-6 py-3 font-display font-semibold text-l2-gold">
                  {c.level}
                </td>
                <td className="px-6 py-3 text-white/65">
                  {c.clanName ?? <span className="text-white/30">—</span>}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-white/75">
                  {c.pvp}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-white/75">
                  {c.pk}
                </td>
                <td className="px-6 py-3 text-xs text-white/55">
                  {c.account}
                </td>
                <td className="px-6 py-3 text-xs text-white/55">
                  {fmtGameTime(c.gameTime)}
                </td>
                <td className="px-6 py-3 text-xs text-white/55">
                  {fmtLastChar(c.lastAccess)}
                </td>
                <td className="px-6 py-3">
                  {c.banned ? (
                    <span className="rounded bg-l2-red/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-l2-red">
                      Banida
                    </span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {c.online ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-l2-green">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-l2-green opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-l2-green" />
                      </span>
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                      Offline
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState({
  Icon,
  title,
  description,
  cta,
}: {
  Icon: IconType;
  title: string;
  description: string;
  cta?: boolean;
}) {
  return (
    <div className="l2-panel p-12 text-center">
      <Icon className="mx-auto mb-4 h-14 w-14 text-white/20" />
      <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
        {title}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-white/55">
        {description}
      </p>
      {cta && (
        <CreateAccountTrigger variant="outline">
          <PlusIcon className="h-4 w-4" />
          <span>Criar conta de jogo</span>
        </CreateAccountTrigger>
      )}
    </div>
  );
}
