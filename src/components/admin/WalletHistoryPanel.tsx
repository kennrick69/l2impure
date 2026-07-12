"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Painel /admin/wallet/history — transações filtráveis server-side
 * (GET /api/admin/wallet-history) + refund idempotente por linha
 * (POST /api/admin/wallet-history/[txId]/refund, exige PIN GM).
 */

export type WalletTxRow = {
  id: number;
  userId: number;
  userEmail: string;
  userCoins: number;
  amount: number;
  coins: number;
  status: string;
  type: string;
  description: string | null;
  mpPaymentId: string | null;
  createdAt: string;
};

type PageData = {
  transactions: WalletTxRow[];
  total: number;
  offset: number;
};

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { v: "", label: "Todos os status" },
  { v: "pending", label: "Pendente" },
  { v: "approved", label: "Aprovado" },
  { v: "rejected", label: "Recusado" },
  { v: "cancelled", label: "Cancelado" },
  { v: "refunded", label: "Reembolsado" },
];

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-yellow-500/15 text-yellow-400",
  rejected: "bg-l2-red/15 text-l2-red",
  cancelled: "bg-white/10 text-white/55",
  refunded: "bg-sky-500/15 text-sky-400",
  refunding: "bg-orange-500/15 text-orange-400",
};

export function WalletHistoryPanel({ initial }: { initial: PageData }) {
  const { show } = useToast();
  const [data, setData] = useState<PageData>(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [user, setUser] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refunding, setRefunding] = useState<number | null>(null);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (status) qs.set("status", status);
      if (user.trim()) qs.set("user", user.trim());
      if (minAmount) qs.set("minAmount", minAmount);
      if (maxAmount) qs.set("maxAmount", maxAmount);
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(offset));
      try {
        const res = await fetch(`/api/admin/wallet-history?${qs.toString()}`);
        const json = (await res.json().catch(() => ({}))) as Partial<PageData> & {
          error?: string;
        };
        if (!res.ok) {
          show(json.error ?? "Falha ao carregar", "error");
          return;
        }
        setData({
          transactions: json.transactions ?? [],
          total: json.total ?? 0,
          offset,
        });
      } catch {
        show("Erro de rede", "error");
      } finally {
        setLoading(false);
      }
    },
    [from, to, status, user, minAmount, maxAmount, show],
  );

  async function refund(t: WalletTxRow) {
    if (!t.mpPaymentId) {
      show("Sem mpPaymentId — refund manual via painel MP", "error");
      return;
    }
    const partialWarn =
      t.userCoins < t.coins
        ? `\n[ATENÇÃO] User tem só ${t.userCoins} coins (gastou parte) — débito será PARCIAL.`
        : "";
    if (
      !confirm(
        `Reembolsar R$ ${t.amount.toFixed(2)} via MP e debitar ${t.coins} coins de ${t.userEmail}?${partialWarn}`,
      )
    )
      return;
    setRefunding(t.id);
    try {
      const res = await fetch(`/api/admin/wallet-history/${t.id}/refund`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        partial?: boolean;
        coinsDebited?: number;
        coinsExpected?: number;
      };
      if (!res.ok) {
        show(
          json.code === "pin_required"
            ? "PIN GM bloqueado — desbloqueie em Game master e tente de novo"
            : (json.error ?? "Refund falhou"),
          "error",
        );
        return;
      }
      if (json.code === "already-refunded") {
        show("Transação já estava reembolsada — nada debitado", "info");
      } else if (json.partial) {
        show(
          `[OK] Refund MP feito. Débito PARCIAL: ${json.coinsDebited}/${json.coinsExpected} coins (user já tinha gasto o resto)`,
          "success",
        );
      } else {
        show(`[OK] Refund completo: ${json.coinsDebited} coins debitados`, "success");
      }
      void load(data.offset);
    } catch {
      show("Erro de rede", "error");
    } finally {
      setRefunding(null);
    }
  }

  const inputCls =
    "rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white";
  const page = Math.floor(data.offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <>
      <section className="mb-4 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            De
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            Até
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            User (id ou email)
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="ex: 42 ou jo@…"
              className={`${inputCls} w-44`}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            R$ min
            <input type="number" min={0} step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={`${inputCls} w-24`} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            R$ max
            <input type="number" min={0} step="0.01" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className={`${inputCls} w-24`} />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(0)}
            className="rounded-md bg-l2-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-l2-red/85 disabled:opacity-50"
          >
            {loading ? "Carregando…" : "Filtrar"}
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-white/45">
              <th className="px-4 py-3">Data</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Valor</th>
              <th className="px-3 py-3">Coins</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">MP payment</th>
              <th className="px-3 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/45">
                  Nenhuma transação com esses filtros
                </td>
              </tr>
            ) : (
              data.transactions.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 whitespace-nowrap text-white/70">
                    {new Date(t.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span className="ml-2 text-[11px] text-white/35">#{t.id}</span>
                  </td>
                  <td className="px-3 py-2.5 text-white">{t.userEmail}</td>
                  <td className="px-3 py-2.5 text-white/80">R$ {t.amount.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-white/80">{t.coins}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE[t.status] ?? "bg-white/10 text-white/55"}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-white/55">
                    {t.mpPaymentId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {t.status === "approved" ? (
                      <button
                        type="button"
                        disabled={refunding === t.id}
                        onClick={() => void refund(t)}
                        className="rounded-md border border-sky-500/40 px-2.5 py-1 text-xs text-sky-400 transition hover:bg-sky-500/10 disabled:opacity-50"
                      >
                        {refunding === t.id ? "…" : "Refund"}
                      </button>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-4 flex items-center justify-between text-sm text-white/55">
        <span>
          {data.total} transações · página {page}/{pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || data.offset === 0}
            onClick={() => void load(Math.max(0, data.offset - PAGE_SIZE))}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs transition hover:text-white disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={loading || data.offset + PAGE_SIZE >= data.total}
            onClick={() => void load(data.offset + PAGE_SIZE)}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs transition hover:text-white disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      </div>
    </>
  );
}
