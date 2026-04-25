import Link from "next/link";
import { bridge, type PvpRow, type ClanRow } from "@/lib/bridge";
import { PageTitle } from "@/components/dashboard/Placeholder";

type Tab = "pvp" | "pk" | "clans";
const TABS: { key: Tab; label: string }[] = [
  { key: "pvp", label: "Top PvP" },
  { key: "pk", label: "Top PK" },
  { key: "clans", label: "Top Clãs" },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab =
    params.tab === "pk" || params.tab === "clans" ? params.tab : "pvp";

  let chars: PvpRow[] = [];
  let clans: ClanRow[] = [];
  let bridgeFailed = false;
  try {
    if (tab === "pvp") chars = await bridge.topPvp();
    else if (tab === "pk") chars = await bridge.topPk();
    else clans = await bridge.topClans();
  } catch (e) {
    console.warn("[rankings] bridge falhou:", (e as Error).message);
    bridgeFailed = true;
  }

  const isEmpty = tab === "clans" ? clans.length === 0 : chars.length === 0;

  return (
    <>
      <PageTitle
        title="Classificação"
        subtitle="Os melhores jogadores e clãs do servidor."
      />

      <div className="mb-6 flex gap-2 border-b border-white/5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/rankings?tab=${t.key}`}
            scroll={false}
            className={`relative px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider transition ${
              t.key === tab
                ? "text-l2-gold"
                : "text-white/55 hover:text-white"
            }`}
          >
            {t.label}
            {t.key === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-l2-gold" />
            )}
          </Link>
        ))}
      </div>

      {bridgeFailed ? (
        <Empty
          icon="⚠️"
          title="Não foi possível carregar a classificação"
          description="A bridge não respondeu. Tente recarregar em alguns instantes."
        />
      ) : isEmpty ? (
        <Empty
          icon={tab === "clans" ? "🛡️" : "🏆"}
          title={
            tab === "clans"
              ? "Nenhum clã cadastrado ainda"
              : "Sem registros pra esse ranking"
          }
          description={
            tab === "clans"
              ? "Quando os primeiros clãs forem criados, aparecem aqui."
              : "Ainda não há kills registradas. Seja o primeiro a fazer história!"
          }
        />
      ) : tab === "clans" ? (
        <ClansTable rows={clans} />
      ) : (
        <CharsTable rows={chars} valueLabel={tab === "pvp" ? "PvP" : "PK"} />
      )}
    </>
  );
}

function CharsTable({
  rows,
  valueLabel,
}: {
  rows: PvpRow[];
  valueLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left">#</th>
              <th className="px-6 py-3 text-left">Nome</th>
              <th className="px-6 py-3 text-left">Classe</th>
              <th className="px-6 py-3 text-left">Lv</th>
              <th className="px-6 py-3 text-left">Clã</th>
              <th className="px-6 py-3 text-right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.rank}
                className="border-b border-white/5 last:border-0 hover:bg-white/3"
              >
                <td className="px-6 py-3">
                  <RankBadge rank={r.rank} />
                </td>
                <td className="px-6 py-3 font-display font-semibold text-white">
                  {r.name}
                </td>
                <td className="px-6 py-3 text-white/75">{r.className}</td>
                <td className="px-6 py-3 font-display font-semibold text-l2-gold">
                  {r.level}
                </td>
                <td className="px-6 py-3 text-white/65">
                  {r.clan ?? <span className="text-white/30">—</span>}
                </td>
                <td className="px-6 py-3 text-right font-display font-bold tabular-nums text-white">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClansTable({ rows }: { rows: ClanRow[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left">#</th>
              <th className="px-6 py-3 text-left">Clã</th>
              <th className="px-6 py-3 text-left">Lv</th>
              <th className="px-6 py-3 text-left">Líder</th>
              <th className="px-6 py-3 text-right">Membros</th>
              <th className="px-6 py-3 text-right">Reputação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.rank}
                className="border-b border-white/5 last:border-0 hover:bg-white/3"
              >
                <td className="px-6 py-3">
                  <RankBadge rank={r.rank} />
                </td>
                <td className="px-6 py-3 font-display font-semibold text-white">
                  {r.name}
                </td>
                <td className="px-6 py-3 font-display font-semibold text-l2-gold">
                  {r.level}
                </td>
                <td className="px-6 py-3 text-white/65">
                  {r.leader ?? <span className="text-white/30">—</span>}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-white/75">
                  {r.members}
                </td>
                <td className="px-6 py-3 text-right font-display font-bold tabular-nums text-white">
                  {r.reputation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="font-display text-sm font-semibold text-white/45">
        #{rank}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold uppercase text-black"
      style={{ background: "var(--l2-gold-gradient)" }}
    >
      {rank}
    </span>
  );
}

function Empty({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-12 text-center">
      <div className="mb-4 text-5xl opacity-40">{icon}</div>
      <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
        {title}
      </h2>
      <p className="mx-auto max-w-md text-sm text-white/55">{description}</p>
    </div>
  );
}
