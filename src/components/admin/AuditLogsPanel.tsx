"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Painel /admin/audit-logs — audit trail filtrável server-side.
 * Dropdown de actions vem de /api/admin/audit-logs/actions com cache
 * client de 5min (module-level). Modal "ver completo" = JSON pretty
 * + copy.
 */

export type AuditLogRow = {
  id: number;
  action: string;
  userId: number | null;
  userEmail: string | null;
  ipAddress: string | null;
  details: unknown;
  createdAt: string;
};

type PageData = {
  logs: AuditLogRow[];
  total: number;
  offset: number;
};

const PAGE_SIZE = 50;
const ACTIONS_CACHE_MS = 5 * 60 * 1000;

let actionsCache: { at: number; actions: string[] } | null = null;

function truncateDetails(details: unknown, max = 80): string {
  if (details === null || details === undefined) return "—";
  const s = JSON.stringify(details);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function AuditLogsPanel({ initial }: { initial: PageData }) {
  const { show } = useToast();
  const [data, setData] = useState<PageData>(initial);
  const [actions, setActions] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [contains, setContains] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (actionsCache && now - actionsCache.at < ACTIONS_CACHE_MS) {
      setActions(actionsCache.actions);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/admin/audit-logs/actions");
        const json = (await res.json().catch(() => ({}))) as {
          actions?: string[];
        };
        if (res.ok && json.actions) {
          actionsCache = { at: Date.now(), actions: json.actions };
          setActions(json.actions);
        }
      } catch {
        /* dropdown fica vazio, filtro por texto ainda funciona */
      }
    })();
  }, []);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (action) qs.set("action", action);
      if (userId.trim()) qs.set("userId", userId.trim());
      if (contains.trim()) qs.set("contains", contains.trim());
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(offset));
      try {
        const res = await fetch(`/api/admin/audit-logs?${qs.toString()}`);
        const json = (await res.json().catch(() => ({}))) as Partial<PageData> & {
          error?: string;
        };
        if (!res.ok) {
          show(json.error ?? "Falha ao carregar", "error");
          return;
        }
        setData({ logs: json.logs ?? [], total: json.total ?? 0, offset });
      } catch {
        show("Erro de rede", "error");
      } finally {
        setLoading(false);
      }
    },
    [from, to, action, userId, contains, show],
  );

  async function copyJson(row: AuditLogRow) {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(row.details, null, 2),
      );
      show("[OK] JSON copiado", "success");
    } catch {
      show("Clipboard bloqueado pelo browser", "error");
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
            Action
            <select value={action} onChange={(e) => setAction(e.target.value)} className={`${inputCls} max-w-56`}>
              <option value="">Todas</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            User ID
            <input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={`${inputCls} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-white/45">
            Contém (details)
            <input
              type="text"
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              placeholder="ex: txId, charName…"
              className={`${inputCls} w-48`}
            />
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
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">IP</th>
              <th className="px-3 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/45">
                  Nenhum registro com esses filtros
                </td>
              </tr>
            ) : (
              data.logs.map((l) => (
                <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 whitespace-nowrap text-white/70">
                    {new Date(l.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-white/8 px-2 py-0.5 font-mono text-[11px] text-white/85">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/80">
                    {l.userEmail ?? (l.userId ? `#${l.userId}` : "—")}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-white/55">
                    {l.ipAddress ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[320px] truncate font-mono text-[11px] text-white/55">
                        {truncateDetails(l.details)}
                      </code>
                      {l.details !== null && l.details !== undefined ? (
                        <button
                          type="button"
                          onClick={() => setModal(l)}
                          className="shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/70 transition hover:text-white"
                        >
                          Ver completo
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-4 flex items-center justify-between text-sm text-white/55">
        <span>
          {data.total} registros · página {page}/{pages}
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

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[color:var(--l2-bg-secondary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="text-sm text-white">
                <span className="font-mono text-white/85">{modal.action}</span>
                <span className="ml-2 text-white/45">#{modal.id}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyJson(modal)}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:text-white"
                >
                  Copiar JSON
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {JSON.stringify(modal.details, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
