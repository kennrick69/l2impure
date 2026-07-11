"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { GmCommandStatus } from "@/lib/gm-commands";

/**
 * Botão reutilizável que enfileira um comando GM e acompanha o ciclo
 * pending → running → done/failed, pollando /api/admin/gm-commands/[id]
 * a cada 2s. Se em 30s o gameserver não pegou o comando, alerta que o
 * poller do gameserver não está rodando (comando segue na fila).
 */

type Phase =
  | "idle"
  | "sending"
  | GmCommandStatus
  | "poll_timeout"
  | "error";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

export function GmCommandTrigger({
  type,
  payload,
  label,
  disabled,
  onFinished,
}: {
  type: string;
  payload: Record<string, unknown>;
  label: string;
  disabled?: boolean;
  /** chamado quando o ciclo termina (done, failed ou timeout do poll) */
  onFinished?: (status: Phase) => void;
}) {
  const { show } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const track = useCallback(
    (commandId: number, startedAt: number) => {
      const tick = async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setPhase("poll_timeout");
          setDetail(
            "Gameserver não pegou o comando em 30s — segue na fila. " +
              "O poller do gameserver está rodando?",
          );
          onFinished?.("poll_timeout");
          return;
        }
        try {
          const res = await fetch(`/api/admin/gm-commands/${commandId}`);
          const data = (await res.json().catch(() => ({}))) as {
            command?: { status: GmCommandStatus; result?: { message?: string | null } | null };
            error?: string;
          };
          if (res.ok && data.command) {
            const st = data.command.status;
            setPhase(st);
            if (st === "done" || st === "failed") {
              const msg = data.command.result?.message ?? null;
              setDetail(msg);
              show(
                st === "done"
                  ? `[OK] ${label} executado`
                  : `[ERRO] ${label} falhou${msg ? `: ${msg}` : ""}`,
                st === "done" ? "success" : "error",
              );
              onFinished?.(st);
              return;
            }
          }
        } catch {
          // rede oscilou — tenta de novo no próximo tick
        }
        timers.current.push(setTimeout(tick, POLL_INTERVAL_MS));
      };
      timers.current.push(setTimeout(tick, POLL_INTERVAL_MS));
    },
    [label, onFinished, show],
  );

  async function trigger() {
    setPhase("sending");
    setDetail(null);
    try {
      const res = await fetch("/api/admin/gm-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        command?: { id: number };
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.command) {
        setPhase("error");
        const msg =
          data.code === "pin_required"
            ? "Sessão GM expirada — desbloqueie o PIN de novo"
            : (data.error ?? "Falha ao enfileirar");
        setDetail(msg);
        show(`[ERRO] ${msg}`, "error");
        onFinished?.("error");
        return;
      }
      setPhase("pending");
      track(data.command.id, Date.now());
    } catch {
      setPhase("error");
      setDetail("Erro de rede");
      show("[ERRO] Erro de rede", "error");
      onFinished?.("error");
    }
  }

  const busy = phase === "sending" || phase === "pending" || phase === "running";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={trigger}
        className="rounded-md bg-l2-red px-5 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-l2-red/85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Executando…" : label}
      </button>
      <StatusChip phase={phase} />
      {detail && (
        <span className="text-xs text-white/55">{detail}</span>
      )}
    </div>
  );
}

function StatusChip({ phase }: { phase: Phase }) {
  if (phase === "idle") return null;
  const map: Record<Exclude<Phase, "idle">, { text: string; cls: string }> = {
    sending: { text: "Enviando…", cls: "bg-white/10 text-white/65" },
    pending: { text: "Na fila (pending)", cls: "bg-l2-gold/15 text-l2-gold" },
    running: { text: "Executando (running)", cls: "bg-l2-gold/15 text-l2-gold" },
    done: { text: "[OK] Concluído", cls: "bg-l2-green/15 text-l2-green" },
    failed: { text: "[ERRO] Falhou", cls: "bg-l2-red/15 text-l2-red" },
    poll_timeout: { text: "[!] Sem resposta em 30s", cls: "bg-l2-red/15 text-l2-red" },
    error: { text: "[ERRO] Não enfileirado", cls: "bg-l2-red/15 text-l2-red" },
  };
  const m = map[phase];
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${m.cls}`}
    >
      {m.text}
    </span>
  );
}
