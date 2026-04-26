"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useNpcsMetadata } from "@/lib/use-npcs-metadata";
import type { NpcMetadata } from "@/lib/bridge";

const PAGE_SIZE = 100;

export function NpcBrowser() {
  const { npcs, error, loading } = useNpcsMetadata();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [page, setPage] = useState(0);

  const types = useMemo(() => {
    if (!npcs) return [];
    const set = new Set<string>();
    for (const n of npcs) if (n.type) set.add(n.type);
    return Array.from(set).sort();
  }, [npcs]);

  const filtered = useMemo(() => {
    if (!npcs) return [];
    const term = search.trim().toLowerCase();
    const isNumericSearch = /^\d+$/.test(term);
    const lMin = levelMin ? Number(levelMin) : null;
    const lMax = levelMax ? Number(levelMax) : null;
    return npcs.filter((n) => {
      if (term) {
        if (isNumericSearch) {
          if (!String(n.id).includes(term)) return false;
        } else {
          const haystack = `${n.name} ${n.title}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
      }
      if (type !== "all" && n.type !== type) return false;
      if (lMin !== null && n.level < lMin) return false;
      if (lMax !== null && n.level > lMax) return false;
      return true;
    });
  }, [npcs, search, type, levelMin, levelMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <>
      <section className="mb-4 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Buscar nome ou ID">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="ex: gatekeeper, 30001"
              className="text-input"
            />
          </Field>
          <Field label="Tipo">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
              className="text-input"
            >
              <option value="all">Todos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level mín">
            <input
              type="number"
              value={levelMin}
              onChange={(e) => {
                setLevelMin(e.target.value);
                setPage(0);
              }}
              className="text-input"
              min={0}
            />
          </Field>
          <Field label="Level máx">
            <input
              type="number"
              value={levelMax}
              onChange={(e) => {
                setLevelMax(e.target.value);
                setPage(0);
              }}
              className="text-input"
              min={0}
            />
          </Field>
        </div>
        <p className="mt-3 text-[10px] text-white/45">
          {loading
            ? "Carregando catálogo (~1.2MB)…"
            : error
              ? `Falha: ${error}`
              : `${filtered.length} NPCs · página ${safePage + 1} de ${totalPages}`}
        </p>
        <style>{`.text-input{width:100%;border-radius:6px;border:1px solid rgb(255 255 255 / 0.08);background:var(--l2-bg-input);padding:.5rem .75rem;font-size:.875rem;color:#fff}.text-input:focus{outline:none}`}</style>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45">
            {filtered.length === 0
              ? "Sem resultados"
              : `${safePage * PAGE_SIZE + 1}-${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded border border-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
        {slice.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/55">
            Nenhum NPC nesse filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-2 text-left">ID</th>
                  <th className="px-6 py-2 text-left">Nome</th>
                  <th className="px-6 py-2 text-left">Título</th>
                  <th className="px-6 py-2 text-left">Tipo</th>
                  <th className="px-6 py-2 text-right">Lv</th>
                  <th className="px-6 py-2 text-right">HP</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((n: NpcMetadata) => (
                  <tr
                    key={n.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-2 font-mono text-xs text-white/55">
                      {n.id}
                    </td>
                    <td className="px-6 py-2">
                      <Link
                        href={`/admin/npcs/${n.id}`}
                        className="font-display font-semibold text-white transition hover:text-l2-gold"
                      >
                        {n.name}
                      </Link>
                    </td>
                    <td className="px-6 py-2 text-xs text-white/55">
                      {n.title || "—"}
                    </td>
                    <td className="px-6 py-2 text-xs text-white/65">
                      {n.type ?? "—"}
                    </td>
                    <td className="px-6 py-2 text-right font-display font-bold text-l2-gold">
                      {n.level}
                    </td>
                    <td className="px-6 py-2 text-right tabular-nums text-white/65">
                      {Math.round(n.hp).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
      {label}
      {children}
    </label>
  );
}
