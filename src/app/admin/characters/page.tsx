import Link from "next/link";
import { bridge, type AdminGmListResponse } from "@/lib/bridge";
import { CharactersFilters } from "@/components/admin/CharactersFilters";

const PAGE_SIZE = 50;

export default async function AdminCharactersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    name: params.name,
    levelMin: params.levelMin,
    levelMax: params.levelMax,
    classId: params.classId,
    online: params.online,
    hasClan: params.hasClan,
    account: params.account,
    sort: params.sort ?? "level",
    dir: params.dir ?? "desc",
    limit: String(PAGE_SIZE),
    offset: params.offset ?? "0",
  };

  let data: AdminGmListResponse | null = null;
  let error: string | null = null;
  try {
    data = await bridge.gm.listCharacters(filters);
  } catch (e) {
    error = (e as Error).message;
  }

  const offset = Number(filters.offset) || 0;
  const total = data?.total ?? 0;
  const pageStart = offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  function pageQuery(o: number): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (k === "offset") continue;
      if (v) qs.append(k, v);
    }
    qs.append("offset", String(o));
    return `/admin/characters?${qs.toString()}`;
  }

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Personagens
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Browser de todos os personagens do servidor — filtros, paginação e
        click pra abrir o detalhe.
      </p>

      <CharactersFilters initial={filters} />

      {error ? (
        <div className="mt-4 rounded-md border border-l2-red/40 bg-l2-red/5 px-4 py-3 text-sm text-l2-red">
          Bridge falhou: {error}
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {total > 0
                ? `${pageStart}-${pageEnd} de ${total}`
                : "Sem resultados"}
            </span>
            <div className="flex gap-2">
              {hasPrev && (
                <Link
                  href={pageQuery(Math.max(0, offset - PAGE_SIZE))}
                  className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  ← Anterior
                </Link>
              )}
              {hasNext && (
                <Link
                  href={pageQuery(offset + PAGE_SIZE)}
                  className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left">Nome</th>
                  <th className="px-6 py-3 text-left">Classe</th>
                  <th className="px-6 py-3 text-left">Lv</th>
                  <th className="px-6 py-3 text-left">Conta</th>
                  <th className="px-6 py-3 text-left">Clã</th>
                  <th className="px-6 py-3 text-right">PvP</th>
                  <th className="px-6 py-3 text-right">PK</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.characters ?? []).map((c) => (
                  <tr
                    key={c.charId}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/characters/${c.charId}`}
                        className="font-display font-semibold text-white transition hover:text-l2-gold"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-white/75">{c.className}</td>
                    <td className="px-6 py-3 font-display font-bold text-l2-gold">
                      {c.level}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {c.account}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/65">
                      {c.clanName ?? <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-white/75">
                      {c.pvp}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-white/75">
                      {c.pk}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {c.online ? (
                        <span className="text-l2-green">Online</span>
                      ) : (
                        <span className="text-white/45">Offline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
