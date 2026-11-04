"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

/**
 * Botão dedicado "Reset HWID" por linha de conta (tela Game Accounts).
 * Confirma, chama POST /api/game/accounts/:login/reset-hwid e dá refresh.
 * As demais ações (trocar senha / excluir) seguem no menu "..." do
 * AccountRowActions.
 */
export function ResetHwidButton({ gameLogin }: { gameLogin: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  async function reset() {
    if (loading) return;
    if (
      !window.confirm(
        `Resetar o HWID travado da conta "${gameLogin}"? A próxima máquina que logar vira a nova travada.`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/game/accounts/${encodeURIComponent(gameLogin)}/reset-hwid`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao resetar HWID");
      show("HWID resetado com sucesso", "success");
      router.refresh();
    } catch (e) {
      show((e as Error).message || "Erro ao resetar HWID", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={loading}
      className="rounded-md bg-[color:var(--l2-gold)] px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-black transition hover:bg-[color:var(--l2-gold-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "..." : "Reset HWID"}
    </button>
  );
}
