"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CLASS_OPTIONS } from "@/lib/l2j-classes";

/**
 * Painel /admin/online — snapshot SSR + auto-refresh 5s client-side.
 * Kick por linha via fila GM (POST /api/admin/gm-commands type=kick):
 * exige PIN GM desbloqueado (desbloqueia no /admin/game-master).
 */

export type OnlinePlayerRow = {
  charId: number;
  name: string;
  level: number;
  classId: number;
  className: string;
  x: number;
  y: number;
  z: number;
  onlinetime: number;
  lastAccess: number;
  account: string;
  clanName: string | null;
  city: string;
};

type Snapshot = {
  players: OnlinePlayerRow[];
  total: number;
  timestamp: number;
  error?: string | null;
};

const REFRESH_MS = 5000;

function fmtSince(lastAccess: number): string {
  if (!lastAccess) return "—";
  const d = new Date(lastAccess);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPlaytime(sec: number): string {
  if (!sec || sec < 60) return "<1min";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

export function OnlinePlayersPanel({ initial }: { initial: Snapshot }) {
  const { show } = useToast();
  const [data, setData] = useState<Snapshot>(initial);
  const [search, setSearch] = useState("");
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [classId, setClassId] = useState("");
  const [paused, setPaused] = useState(false);
  const [kicking, setKicking] = useState<string | null>(null);
  const filtersRef = useRef({ search, levelMin, levelMax, classId });
  filtersRef.current = { search, levelMin, levelMax, classId };

  const load = useCallback(async () => {
    const f = filtersRef.current;
    const qs = new URLSearchParams();
    if (f.search) qs.set("search", f.search);
    if (f.levelMin) qs.set("levelMin", f.levelMin);
    if (f.levelMax) qs.set("levelMax", f.levelMax);
    if (f.classId) qs.set("classId", f.classId);
    qs.set("limit", "100");
    try {
      const res = await fetch(`/api/admin/online?${qs.toString()}`);
      const json = (await res.json().catch(() => ({}))) as Partial<Snapshot> & {
        error?: string;
      };
      if (!res.ok) {
        setData((d) => ({ ...d, error: json.error ?? `HTTP ${res.status}` }));
        return;
      }
      setData({
        players: json.players ?? [],
        total: json.total ?? 0,
        timestamp: json.timestamp ?? Date.now(),
        error: null,
      });
    } catch {
      setData((d) => ({ ...d, error: "Rede indisponível" }));
    }
  }, []);

  // Auto-refresh 5s + reload imediato quando filtro muda
  useEffect(() => {
    if (paused) return;
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load, paused, search, levelMin, levelMax, classId]);

  async function kick(p: OnlinePlayerRow) {
    if (!confirm(`Kickar ${p.name} (lv ${p.level}, ${p.className})?`)) return;
    setKicking(p.name);
    try {
      const res = await fetch("/api/admin/gm-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kick", payload: { charName: p.name } }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        show(
          json.code === "pin_required"
            ? "PIN GM bloqueado — desbloqueie em Game master e tente de novo"
            : (json.error ?? "Falha ao enfileirar kick"),
          "error",
        );
        return;
      }
      show(`[OK] Kick de ${p.name} enfileirado na fila GM`, "success");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setKicking(null);
    }
  }

  const inputCls =
    "rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white";

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-4 lg:flex-row lg:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome…"
          className={`${inputCls} lg:w-56`}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={127}
            value={levelMin}
            onChange={(e) => setLevelMin(e.target.value)}
            placeholder="Lv min"
            className={`${inputCls} w-24`}
          />
          <span className="text-white/40">–</span>
          <input
            type="number"
            min={1}
            max={127}
            value={levelMax}
            onChange={(e) => setLevelMax(e.target.value)}
            placeholder="Lv max"
            className={`${inputCls} w-24`}
          />
        </div>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={inputCls}
        >
          <option value="">Todas as classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex flex-1 items-center justify-end gap-3 text-xs text-white/55">
          <span>
            {data.total} online · atualizado{" "}
            {new Date(data.timestamp).toLocaleTimeString("pt-BR")}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:text-white"
          >
            {paused ? "▶ Retomar" : "⏸ Pausar"}
          </button>
        </div>
      </section>

      {data.error ? (
        <div className="mb-4 rounded-md border border-l2-red/40 bg-l2-red/10 px-4 py-3 text-sm text-l2-red">
          [ERRO] {data.error} — mostrando último snapshot
        </div>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-white/45">
              <th className="px-4 py-3">Nome</th>
              <th className="px-3 py-3">Level</th>
              <th className="px-3 py-3">Classe</th>
              <th className="px-3 py-3">Localização</th>
              <th className="px-3 py-3">Online desde</th>
              <th className="px-3 py-3">Tempo total</th>
              <th className="px-3 py-3">Clan</th>
              <th className="px-3 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {data.players.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/45">
                  Nenhum jogador online com esses filtros
                </td>
              </tr>
            ) : (
              data.players.map((p) => (
                <tr
                  key={p.charId}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-2.5 font-medium text-white">
                    {p.name}
                    <span className="ml-2 text-[11px] text-white/35">
                      {p.account}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/80">{p.level}</td>
                  <td className="px-3 py-2.5 text-white/80">{p.className}</td>
                  <td className="px-3 py-2.5 text-white/70">{p.city}</td>
                  <td className="px-3 py-2.5 text-white/70">
                    {fmtSince(p.lastAccess)}
                  </td>
                  <td className="px-3 py-2.5 text-white/70">
                    {fmtPlaytime(p.onlinetime)}
                  </td>
                  <td className="px-3 py-2.5 text-white/70">
                    {p.clanName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      disabled={kicking === p.name}
                      onClick={() => void kick(p)}
                      className="rounded-md border border-l2-red/40 px-2.5 py-1 text-xs text-l2-red transition hover:bg-l2-red/10 disabled:opacity-50"
                    >
                      {kicking === p.name ? "…" : "Kick"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
