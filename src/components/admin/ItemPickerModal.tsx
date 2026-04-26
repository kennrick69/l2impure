"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemMetadata } from "@/lib/bridge";
import { useItemsMetadata } from "@/lib/use-items-metadata";
import { ItemIcon } from "@/components/admin/ItemIcon";

const GRADES = ["NONE", "D", "C", "B", "A", "S"] as const;
type Grade = (typeof GRADES)[number];

const TYPES = ["Weapon", "Armor", "EtcItem"] as const;
type ItemType = (typeof TYPES)[number] | "all";

const RESULT_LIMIT = 200;

export function ItemPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ItemMetadata) => void;
}) {
  const { items, error, loading } = useItemsMetadata();
  const [grade, setGrade] = useState<Grade>("S");
  const [type, setType] = useState<ItemType>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const { filtered, totalMatches } = useMemo(() => {
    if (!items) return { filtered: [], totalMatches: 0 };
    const term = search.trim().toLowerCase();
    const isNumericSearch = /^\d+$/.test(term);
    const out: ItemMetadata[] = [];
    let total = 0;
    for (const it of items) {
      // Search por id ou name sobrescreve filtro de grade
      if (term) {
        if (isNumericSearch) {
          if (String(it.id).includes(term)) {
            total++;
            if (out.length < RESULT_LIMIT) out.push(it);
          }
          continue;
        }
        if (!it.name.toLowerCase().includes(term)) continue;
        if (type !== "all" && it.type !== type) continue;
        total++;
        if (out.length < RESULT_LIMIT) out.push(it);
        continue;
      }
      // Sem search — filtra por grade + tipo
      if (it.grade !== grade) continue;
      if (type !== "all" && it.type !== type) continue;
      total++;
      if (out.length < RESULT_LIMIT) out.push(it);
    }
    return { filtered: out, totalMatches: total };
  }, [items, grade, type, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[color:var(--l2-bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            Selecionar item
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-white/45 transition hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Filtros */}
        <div className="border-b border-white/5 px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45 self-center mr-1">
              Grade
            </span>
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`rounded-md border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition ${
                  grade === g && !search
                    ? "border-l2-gold bg-l2-gold/10 text-l2-gold"
                    : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"
                }`}
                disabled={Boolean(search)}
              >
                {g === "NONE" ? "No-grade" : g}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-white/45 self-center mr-1">
              Tipo
            </span>
            {(["all", ...TYPES] as ItemType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition ${
                  type === t
                    ? "border-l2-gold bg-l2-gold/10 text-l2-gold"
                    : "border-white/10 text-white/65 hover:border-white/20 hover:text-white"
                }`}
              >
                {t === "all" ? "Tudo" : t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou ID (ex: tateossian, 6660)…"
            className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white focus:border-l2-gold focus:outline-none"
            autoFocus
          />
          {search && (
            <p className="mt-2 text-[10px] text-white/45">
              Busca livre ignora filtro de grade. Total de matches:{" "}
              <strong className="text-white">{totalMatches}</strong>
              {totalMatches > RESULT_LIMIT && ` (mostrando ${RESULT_LIMIT})`}
            </p>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-white/55">
              Carregando catálogo de items… (~1.7MB, fica em cache)
            </div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-l2-red">
              Falha ao carregar items: {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-white/55">
              Nenhum item nesse filtro.
            </div>
          ) : (
            <ul className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(it);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-md border border-white/5 bg-[color:var(--l2-bg-card)] px-3 py-2 text-left transition hover:border-l2-gold hover:bg-[color:var(--l2-bg-card-hover)]"
                  >
                    <ItemIcon itemId={it.id} item={it} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-display text-sm font-semibold text-white">
                          {it.name}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-white/45">
                          #{it.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/55">
                        <span>{it.type}</span>
                        <span className="rounded bg-white/8 px-1.5 py-0.5 font-display font-semibold uppercase tracking-wider">
                          {it.grade === "NONE" ? "no-grade" : it.grade}
                        </span>
                        {it.slot && <span>{it.slot}</span>}
                        {it.stackable && <span>· stackable</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-3 text-[10px] text-white/45">
          Cache local 24h em localStorage. Limpe com Ctrl+Shift+R se a
          bridge re-gerar o items.json.
        </div>
      </div>
    </div>
  );
}
