"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function ServerControls({
  currentOffset,
  bridgeRaw,
}: {
  currentOffset: number | null;
  bridgeRaw: number | null;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [offsetInput, setOffsetInput] = useState(
    currentOffset === null ? "" : String(currentOffset),
  );
  const [restarting, setRestarting] = useState(false);
  const [savingOffset, setSavingOffset] = useState(false);

  async function restart() {
    if (
      !confirm(
        "Reiniciar l2j-game.service? Players online serão desconectados.",
      )
    )
      return;
    setRestarting(true);
    try {
      const res = await fetch("/api/admin/server/restart", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao reiniciar", "error");
        return;
      }
      show("Reinício enviado. O servidor leva alguns minutos pra subir.", "success");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setRestarting(false);
    }
  }

  async function saveOffset(e: FormEvent) {
    e.preventDefault();
    setSavingOffset(true);
    try {
      const value = offsetInput.trim() === "" ? null : Number(offsetInput);
      if (value !== null && !Number.isFinite(value)) {
        show("Offset precisa ser um número (ou vazio pra remover)", "error");
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "player_count_offset", value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao salvar", "error");
        return;
      }
      show("Offset atualizado", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setSavingOffset(false);
    }
  }

  return (
    <>
      <section className="mb-8 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Reiniciar game server
        </h2>
        <p className="mb-4 text-xs text-white/55">
          Roda <code className="rounded bg-black/30 px-1.5 py-0.5">systemctl restart l2j-game</code> na VPS via bridge. Players online perdem conexão; servidor leva 3-5 min pra voltar.
        </p>
        <button
          type="button"
          onClick={restart}
          disabled={restarting}
          className="rounded-md bg-l2-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {restarting ? "Reiniciando..." : "Reiniciar servidor"}
        </button>
      </section>

      <section className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Player count — offset visual
        </h2>
        <p className="mb-4 text-xs text-white/55">
          O número exibido no painel é{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5">
            real ({bridgeRaw ?? "?"}) + offset
          </code>
          . Vazio remove o override e usa o valor padrão da bridge (.env).
        </p>
        <form onSubmit={saveOffset} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Offset
            <input
              type="number"
              value={offsetInput}
              onChange={(e) => setOffsetInput(e.target.value)}
              placeholder="ex: 55"
              className="w-40 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={savingOffset}
            className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:opacity-50"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {savingOffset ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </section>
    </>
  );
}
