"use client";

import { useCallback, useEffect, useState } from "react";
import { GmCommandTrigger } from "@/components/admin/GmCommandTrigger";
import type { BanDto } from "@/app/api/admin/bans/route";

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-l2-red/60 focus:outline-none";
const labelCls =
  "mb-1 block font-display text-[10px] font-semibold uppercase tracking-wider text-white/45";
const cardCls =
  "rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6";

const DURATIONS = [
  { label: "1 hora", hours: 1 },
  { label: "24 horas", hours: 24 },
  { label: "7 dias", hours: 168 },
  { label: "30 dias", hours: 720 },
  { label: "Permanente", hours: 0 },
] as const;

function fmtBrt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

export function ModerationBans() {
  const [bans, setBans] = useState<BanDto[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const [banLogin, setBanLogin] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState<number>(0);

  const refresh = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        status: showAll ? "all" : "active",
        limit: "100",
      });
      const s = search.trim();
      if (s) qs.set("login", s);
      const res = await fetch(`/api/admin/bans?${qs.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        bans?: BanDto[];
        error?: string;
      };
      if (!res.ok || !data.bans) {
        setListError(data.error ?? "Falha ao carregar a lista de bans");
        return;
      }
      setListError(null);
      setBans(data.bans);
    } catch {
      setListError("Erro de rede ao carregar a lista de bans");
    }
  }, [showAll, search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const banPayload: Record<string, unknown> = {
    accountLogin: banLogin.trim(),
    reason: banReason.trim(),
  };
  if (banHours > 0) banPayload.durationHours = banHours;

  return (
    <div className="flex flex-col gap-6">
      <section className={cardCls}>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
          🚫 Banir conta
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Derruba a sessão ativa na hora (se tiver char online) e bloqueia o
          login da conta. O gameserver executa via fila GM em poucos segundos.
        </p>
        <div className="mb-4 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="ban-login">
              Login da conta
            </label>
            <input
              id="ban-login"
              className={inputCls}
              value={banLogin}
              maxLength={48}
              placeholder="login exato"
              onChange={(e) => setBanLogin(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="ban-reason">
              Motivo (máx 200)
            </label>
            <input
              id="ban-reason"
              className={inputCls}
              value={banReason}
              maxLength={200}
              placeholder="ex: uso de bot"
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="ban-duration">
              Duração
            </label>
            <select
              id="ban-duration"
              className={inputCls}
              value={banHours}
              onChange={(e) => setBanHours(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d.label} value={d.hours}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <GmCommandTrigger
          type="ban_account"
          payload={banPayload}
          label="Banir conta"
          disabled={
            banLogin.trim().length < 3 || banReason.trim().length === 0
          }
          onFinished={() => void refresh()}
        />
      </section>

      <section className={cardCls}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
            {showAll ? "Histórico de bans" : "Bans ativos"}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} w-48`}
              value={search}
              maxLength={48}
              placeholder="buscar por login…"
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="rounded-md border border-white/15 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:border-l2-red/50 hover:text-white"
            >
              {showAll ? "Só ativos" : "Ver histórico"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-white/15 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:border-l2-red/50 hover:text-white"
            >
              Atualizar
            </button>
          </div>
        </div>

        {listError ? (
          <p className="text-sm text-l2-red">[ERRO] {listError}</p>
        ) : bans === null ? (
          <p className="text-sm text-white/45">Carregando…</p>
        ) : bans.length === 0 ? (
          <p className="text-sm text-white/45">
            {showAll
              ? "Nenhum ban registrado."
              : "Nenhum ban ativo — todo mundo comportado."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 font-display text-[10px] uppercase tracking-wider text-white/45">
                  <th className="py-2 pr-3">Login</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2 pr-3">Banido por</th>
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Expira</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 font-semibold text-white">
                      {b.accountLogin}
                    </td>
                    <td className="max-w-[220px] py-2 pr-3 text-white/65">
                      {b.reason}
                    </td>
                    <td className="py-2 pr-3 text-white/65">{b.bannedBy}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-white/45">
                      {fmtBrt(b.bannedAt)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-white/45">
                      {b.expiresAt ? fmtBrt(b.expiresAt) : "permanente"}
                    </td>
                    <td className="py-2 pr-3">
                      <BanStatusBadge ban={b} />
                    </td>
                    <td className="py-2">
                      {b.active ? (
                        <GmCommandTrigger
                          type="unban_account"
                          payload={{ accountLogin: b.accountLogin }}
                          label="Desbanir"
                          onFinished={() => void refresh()}
                        />
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] text-white/35">
          Horários em BRT (America/Sao_Paulo). Bans temporários são desbanidos
          automaticamente pelo scheduler da bridge quando expiram.
        </p>
      </section>
    </div>
  );
}

function BanStatusBadge({ ban }: { ban: BanDto }) {
  if (ban.active) {
    return (
      <span className="rounded-md bg-l2-red/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-l2-red">
        [ATIVO]
      </span>
    );
  }
  const label =
    ban.unbannedBy === "auto-expire"
      ? "[EXPIRADO]"
      : ban.unbannedAt
        ? "[DESBANIDO]"
        : "[EXPIRADO]";
  return (
    <span className="rounded-md bg-white/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white/45">
      {label}
    </span>
  );
}
