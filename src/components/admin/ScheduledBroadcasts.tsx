"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";
import type { ScheduledCommandDto } from "@/app/api/admin/scheduled-broadcasts/route";

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-l2-red/60 focus:outline-none";
const labelCls =
  "mb-1 block font-display text-[10px] font-semibold uppercase tracking-wider text-white/45";
const cardCls =
  "rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6";

function fmtBrt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

/** valor default do datetime-local: agora + 1h, no fuso do browser (BRT pro JOs) */
function defaultLocalDatetime(): string {
  const d = new Date(Date.now() + 3600_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduledBroadcasts() {
  const { show } = useToast();
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState(defaultLocalDatetime);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<ScheduledCommandDto[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scheduled-broadcasts?limit=50");
      const data = (await res.json().catch(() => ({}))) as {
        scheduled?: ScheduledCommandDto[];
        error?: string;
      };
      if (!res.ok || !data.scheduled) {
        setListError(data.error ?? "Falha ao carregar agendamentos");
        return;
      }
      setListError(null);
      setList(data.scheduled);
    } catch {
      setListError("Erro de rede ao carregar agendamentos");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || !when) return;
    // datetime-local é interpretado no fuso do browser — new Date() converte pra UTC
    const whenDate = new Date(when);
    if (Number.isNaN(whenDate.getTime())) {
      show("[ERRO] Data/hora inválida", "error");
      return;
    }
    if (whenDate.getTime() < Date.now() - 60_000) {
      show("[ERRO] Horário no passado — escolha um horário futuro", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/scheduled-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          scheduledAt: whenDate.toISOString(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        show(
          `[ERRO] ${
            data.code === "pin_required"
              ? "Sessão GM expirada — desbloqueie o PIN de novo"
              : (data.error ?? "Falha ao agendar")
          }`,
          "error",
        );
        return;
      }
      show(
        `[OK] Broadcast agendado pra ${fmtBrt(whenDate.toISOString())} (BRT)`,
        "success",
      );
      setMessage("");
      void refresh();
    } catch {
      show("[ERRO] Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: number) {
    setCancelBusy(id);
    try {
      const res = await fetch(`/api/admin/scheduled-broadcasts/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(`[ERRO] ${data.error ?? "Falha ao cancelar"}`, "error");
        return;
      }
      show("[OK] Agendamento cancelado", "success");
      void refresh();
    } catch {
      show("[ERRO] Erro de rede", "error");
    } finally {
      setCancelBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cardCls}>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
          ⏰ Agendar broadcast
        </h2>
        <p className="mb-4 text-xs text-white/45">
          A mensagem entra na fila GM no horário marcado (precisão ~30s — tick
          do scheduler da bridge) e o gameserver shouta pra todos os jogadores
          online. Horário no fuso <strong>BRT (America/Sao_Paulo)</strong>.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="sb-message">
              Mensagem (máx 500)
            </label>
            <textarea
              id="sb-message"
              rows={2}
              maxLength={500}
              className={`${inputCls} resize-y`}
              value={message}
              placeholder="ex: Evento 2x XP começa em 1 hora — preparem-se!"
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="max-w-xs">
            <label className={labelCls} htmlFor="sb-when">
              Data e hora (BRT)
            </label>
            <input
              id="sb-when"
              type="datetime-local"
              className={inputCls}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={busy || !message.trim() || !when}
              className="rounded-md bg-l2-red px-5 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-l2-red/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Agendando…" : "Agendar broadcast"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardCls}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
            Agendamentos
          </h2>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-white/15 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-white/75 transition hover:border-l2-red/50 hover:text-white"
          >
            Atualizar
          </button>
        </div>
        {listError ? (
          <p className="text-sm text-l2-red">[ERRO] {listError}</p>
        ) : list === null ? (
          <p className="text-sm text-white/45">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-white/45">
            Nenhum broadcast agendado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 font-display text-[10px] uppercase tracking-wider text-white/45">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Mensagem</th>
                  <th className="py-2 pr-3">Quando (BRT)</th>
                  <th className="py-2 pr-3">Quem</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 text-white/45">{s.id}</td>
                    <td className="max-w-[280px] py-2 pr-3 text-white/80">
                      {String(
                        (s.payload as { message?: string })?.message ?? "—",
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-white/65">
                      {fmtBrt(s.scheduledAt)}
                    </td>
                    <td className="py-2 pr-3 text-white/65">{s.requestedBy}</td>
                    <td className="py-2 pr-3">
                      <ScheduleStatusBadge s={s} />
                    </td>
                    <td className="py-2">
                      {s.status === "pending" ? (
                        <button
                          type="button"
                          disabled={cancelBusy === s.id}
                          onClick={() => void cancel(s.id)}
                          className="rounded-md border border-l2-red/40 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red transition hover:bg-l2-red/10 disabled:opacity-40"
                        >
                          {cancelBusy === s.id ? "Cancelando…" : "Cancelar"}
                        </button>
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
      </section>
    </div>
  );
}

function ScheduleStatusBadge({ s }: { s: ScheduledCommandDto }) {
  if (s.status === "pending") {
    return (
      <span className="rounded-md bg-l2-gold/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-l2-gold">
        agendado
      </span>
    );
  }
  if (s.status === "fired") {
    return (
      <span className="rounded-md bg-l2-green/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-l2-green">
        [OK] disparado{s.firedAt ? ` ${fmtBrt(s.firedAt)}` : ""}
      </span>
    );
  }
  return (
    <span className="rounded-md bg-white/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white/45">
      cancelado
    </span>
  );
}
