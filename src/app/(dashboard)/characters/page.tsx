import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bridge, type GameCharacter } from "@/lib/bridge";
import { PageTitle } from "@/components/dashboard/Placeholder";
import { CreateAccountTrigger } from "@/components/dashboard/CreateAccountTrigger";

type Row = GameCharacter & { account: string };

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
            (c): Row => ({ ...c, account: acc.gameLogin }),
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
            className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white"
          >
            Ver todas →
          </Link>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon="⚔️"
          title="Você ainda não tem contas de jogo"
          description="Crie sua primeira conta de jogo e entre no servidor pra começar a criar personagens."
          cta
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon="🎭"
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
  icon,
  title,
  description,
  cta,
}: {
  icon: string;
  title: string;
  description: string;
  cta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-12 text-center">
      <div className="mb-4 text-5xl opacity-40">{icon}</div>
      <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
        {title}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-white/55">
        {description}
      </p>
      {cta && (
        <CreateAccountTrigger variant="outline">
          <span>➕</span>
          <span>Criar conta de jogo</span>
        </CreateAccountTrigger>
      )}
    </div>
  );
}
