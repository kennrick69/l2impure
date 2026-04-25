"use client";

import { useState } from "react";
import Link from "next/link";
import { statisticsServers } from "@/lib/l2impure-data";
import type { StatisticsServer, TopCard, TopRow } from "@/types/l2impure";

function dotColor(c?: TopRow["clanDot"]) {
  switch (c) {
    case "blue":
      return "rgb(59, 130, 246)";
    case "red":
      return "rgb(var(--l2-red))";
    case "purple":
      return "rgb(168, 85, 247)";
    case "gold":
      return "rgb(var(--l2-gold))";
    default:
      return "transparent";
  }
}

function StatsCard({ card }: { card: TopCard }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] px-6 py-6">
      <h3 className="mb-5 font-display text-sm font-bold uppercase tracking-[2px] text-[color:var(--l2-text-gold)]">
        {card.title}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
            <th className="w-10 pb-3 font-semibold">Nº</th>
            <th className="pb-3 font-semibold">Nome</th>
            <th className="pb-3 text-right font-semibold">
              {card.valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((r) => (
            <tr
              key={`${r.rank}-${r.name}`}
              className="border-t border-white/5"
            >
              <td
                className={`py-2.5 font-bold ${
                  r.rank === 1 ? "text-[color:var(--l2-text-gold)]" : "text-white"
                }`}
              >
                {r.rank}
              </td>
              <td className="py-2.5 text-white">
                <span className="flex items-center gap-2">
                  {r.clanDot && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: dotColor(r.clanDot) }}
                    />
                  )}
                  <span className="truncate">{r.name}</span>
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-white">
                {typeof r.value === "number"
                  ? r.value.toLocaleString("pt-BR")
                  : r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatisticsSection() {
  const [activeId, setActiveId] = useState<string>(statisticsServers[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const active: StatisticsServer =
    statisticsServers.find((s) => s.id === activeId) ?? statisticsServers[0];

  return (
    <section id="estatisticas" className="relative py-14 md:py-20">
      <div className="l2-container-wide">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏆</span>
            <h2 className="font-display text-lg font-bold uppercase tracking-[1.5px] text-white md:text-xl">
              Estatísticas
            </h2>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 rounded-md border border-white/15 bg-black/40 px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[color:var(--l2-text-gold)]"
            >
              <span>{active.label}</span>
              <span
                className="l2-arrow transition-transform duration-300"
                style={{
                  transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 min-w-[18rem] rounded-md border border-white/10 bg-black/95 p-1 shadow-xl backdrop-blur">
                <ul>
                  {statisticsServers.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(s.id);
                          setMenuOpen(false);
                        }}
                        className={`block w-full rounded px-4 py-2 text-left font-display text-xs uppercase tracking-wider transition ${
                          s.id === activeId
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {active.cards.map((c) => (
            <StatsCard key={c.title} card={c} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/rankings"
            className="inline-block font-display text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)] underline underline-offset-4 hover:no-underline"
          >
            Mostrar todas as estatísticas
          </Link>
        </div>
      </div>
    </section>
  );
}
