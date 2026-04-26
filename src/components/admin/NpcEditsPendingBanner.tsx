"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function NpcEditsPendingBanner({ pending }: { pending: boolean }) {
  const router = useRouter();
  const { show } = useToast();
  const [restarting, setRestarting] = useState(false);

  if (!pending) return null;

  async function restart() {
    if (
      !confirm(
        "Reiniciar o game server agora? Players online perdem conexão (servidor demora 3-5 min pra subir).",
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
      show("Reinício enviado — servidor sobe em ~3 min", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-l2-gold/40 bg-l2-gold/10 px-4 py-3 text-sm text-l2-gold">
      <span>
        ⚠️ Você tem mudanças em XML/HTM pendentes. Pra elas valerem in-game,
        o game server precisa reiniciar.
      </span>
      <button
        type="button"
        onClick={restart}
        disabled={restarting}
        className="shrink-0 rounded-md px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-black disabled:opacity-50"
        style={{ background: "var(--l2-gold-gradient)" }}
      >
        {restarting ? "Reiniciando..." : "Reiniciar servidor"}
      </button>
    </div>
  );
}
