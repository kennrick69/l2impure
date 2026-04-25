"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function ReferralAdminControls({
  enabled,
  rewardReferrer,
  rewardReferred,
}: {
  enabled: boolean;
  rewardReferrer: number;
  rewardReferred: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [r1, setR1] = useState(String(rewardReferrer));
  const [r2, setR2] = useState(String(rewardReferred));
  const [busy, setBusy] = useState(false);

  async function setSetting(key: string, value: unknown, label: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      show(`${label} atualizado`, "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled() {
    await setSetting("referrals_enabled", !enabled, "Sistema");
  }

  async function saveRewards(e: FormEvent) {
    e.preventDefault();
    const a = Number(r1);
    const b = Number(r2);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
      show("Valores precisam ser números >= 0", "error");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "referral_reward_referrer", value: a }),
      });
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "referral_reward_referred", value: b }),
      });
      show("Recompensas atualizadas", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Sistema de indicações
        </h2>
        <p className="mb-4 text-xs text-white/55">
          Quando desativado, /referrals informa o usuário e novos cadastros
          ignoram o ?ref=.
        </p>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={busy}
          className={`rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
            enabled
              ? "border border-l2-red/40 text-l2-red hover:bg-l2-red/10"
              : "text-black"
          }`}
          style={!enabled ? { background: "var(--l2-gold-gradient)" } : undefined}
        >
          {enabled ? "Desativar" : "Ativar"}
        </button>
        <span className="ml-3 text-xs text-white/55">
          Status: <strong className={enabled ? "text-l2-green" : "text-l2-red"}>{enabled ? "Ativo" : "Desativado"}</strong>
        </span>
      </div>

      <form
        onSubmit={saveRewards}
        className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6"
      >
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-white">
          Valores de recompensa (coins)
        </h2>
        <p className="mb-4 text-xs text-white/55">
          Aplicados na conversão (level 40). Valores atuais sobrescrevem o
          default do código.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Indicador
            <input
              type="number"
              value={r1}
              onChange={(e) => setR1(e.target.value)}
              min={0}
              className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Indicado
            <input
              type="number"
              value={r2}
              onChange={(e) => setR2(e.target.value)}
              min={0}
              className="rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </section>
  );
}
