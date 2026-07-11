"use client";

import { useCallback, useEffect, useState } from "react";
import { GmCommandTrigger } from "@/components/admin/GmCommandTrigger";
import type { GmCommandDto } from "@/lib/gm-commands";

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-l2-red/60 focus:outline-none";
const labelCls =
  "mb-1 block font-display text-[10px] font-semibold uppercase tracking-wider text-white/45";
const cardCls =
  "rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6";

export function GmConsole() {
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [kickChar, setKickChar] = useState("");
  const [giveChar, setGiveChar] = useState("");
  const [giveItemId, setGiveItemId] = useState("");
  const [giveCount, setGiveCount] = useState("1");
  const [commands, setCommands] = useState<GmCommandDto[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gm-commands?limit=30");
      const data = (await res.json().catch(() => ({}))) as {
        commands?: GmCommandDto[];
        error?: string;
      };
      if (!res.ok || !data.commands) {
        setListError(data.error ?? "Falha ao carregar a fila");
        return;
      }
      setListError(null);
      setCommands(data.commands);
    } catch {
      setListError("Erro de rede ao carregar a fila");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const giveItemIdNum = parseInt(giveItemId, 10);
  const giveCountNum = parseInt(giveCount, 10);

  return (
    <div className="flex flex-col gap-6">
      <section className={cardCls}>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
          📣 Broadcast global
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Mensagem pra todos os jogadores online, sem logar como GM.
        </p>
        <div className="mb-4">
          <label className={labelCls} htmlFor="gmc-broadcast">
            Mensagem (máx 500)
          </label>
          <textarea
            id="gmc-broadcast"
            rows={2}
            maxLength={500}
            className={`${inputCls} resize-y`}
            value={broadcastMsg}
            placeholder="ex: Manutenção programada em 15 minutos — deslogem em local seguro."
            onChange={(e) => setBroadcastMsg(e.target.value)}
          />
        </div>
        <GmCommandTrigger
          type="broadcast"
          payload={{ message: broadcastMsg.trim() }}
          label="Enviar broadcast"
          disabled={broadcastMsg.trim().length === 0}
          onFinished={() => void refresh()}
        />
      </section>

      <section className={cardCls}>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
          👢 Kick de personagem
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Desconecta um personagem online na hora.
        </p>
        <div className="mb-4 max-w-xs">
          <label className={labelCls} htmlFor="gmc-kick">
            Nome do personagem
          </label>
          <input
            id="gmc-kick"
            className={inputCls}
            value={kickChar}
            placeholder="nome exato"
            onChange={(e) => setKickChar(e.target.value)}
          />
        </div>
        <GmCommandTrigger
          type="kick"
          payload={{ charName: kickChar.trim() }}
          label="Kickar"
          disabled={kickChar.trim().length === 0}
          onFinished={() => void refresh()}
        />
      </section>

      <section className={cardCls}>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
          🎁 Dar item (personagem online)
        </h2>
        <p className="mb-4 text-xs text-white/45">
          Entrega direto no inventário de quem está jogando. Pra personagem
          offline, use o Game master (escrita direta no banco).
        </p>
        <div className="mb-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="gmc-give-char">
              Personagem
            </label>
            <input
              id="gmc-give-char"
              className={inputCls}
              value={giveChar}
              placeholder="nome exato"
              onChange={(e) => setGiveChar(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="gmc-give-item">
              Item ID
            </label>
            <input
              id="gmc-give-item"
              type="number"
              min={1}
              className={inputCls}
              value={giveItemId}
              placeholder="ex: 57 (adena)"
              onChange={(e) => setGiveItemId(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="gmc-give-count">
              Quantidade
            </label>
            <input
              id="gmc-give-count"
              type="number"
              min={1}
              max={1000000}
              className={inputCls}
              value={giveCount}
              onChange={(e) => setGiveCount(e.target.value)}
            />
          </div>
        </div>
        <GmCommandTrigger
          type="give_item"
          payload={{
            charName: giveChar.trim(),
            itemId: giveItemIdNum,
            count: giveCountNum,
          }}
          label="Dar item"
          disabled={
            giveChar.trim().length === 0 ||
            !Number.isInteger(giveItemIdNum) ||
            giveItemIdNum <= 0 ||
            !Number.isInteger(giveCountNum) ||
            giveCountNum <= 0
          }
          onFinished={() => void refresh()}
        />
      </section>

      <section className={cardCls}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
            Fila recente
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
        ) : commands === null ? (
          <p className="text-sm text-white/45">Carregando…</p>
        ) : commands.length === 0 ? (
          <p className="text-sm text-white/45">
            Fila vazia — nenhum comando enviado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 font-display text-[10px] uppercase tracking-wider text-white/45">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Payload</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Quem</th>
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 text-white/45">{c.id}</td>
                    <td className="py-2 pr-3 font-semibold text-white">
                      {c.type}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-white/65">
                      <code>{JSON.stringify(c.payload)}</code>
                    </td>
                    <td className="py-2 pr-3">
                      <QueueStatusBadge status={c.status} />
                    </td>
                    <td className="py-2 pr-3 text-white/65">{c.requestedBy}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-white/45">
                      {new Date(c.requestedAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="max-w-[220px] truncate py-2 text-white/65">
                      {c.result?.message ?? "—"}
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

function QueueStatusBadge({ status }: { status: GmCommandDto["status"] }) {
  const map: Record<GmCommandDto["status"], { text: string; cls: string }> = {
    pending: { text: "pending", cls: "bg-l2-gold/15 text-l2-gold" },
    running: { text: "running", cls: "bg-l2-gold/15 text-l2-gold" },
    done: { text: "[OK] done", cls: "bg-l2-green/15 text-l2-green" },
    failed: { text: "[ERRO] failed", cls: "bg-l2-red/15 text-l2-red" },
  };
  const m = map[status] ?? { text: status, cls: "bg-white/10 text-white/45" };
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${m.cls}`}
    >
      {m.text}
    </span>
  );
}
