"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";

export function PromoCodeForm() {
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = /^[A-Za-z0-9_-]{3,64}$/.test(code);
  const canSubmit = valid && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/promo-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        note?: string;
      };
      if (!res.ok) {
        show(data.error ?? "Não foi possível resgatar o código", "error");
        return;
      }
      show(data.note ?? "Código resgatado!", "success");
      setCode("");
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-6"
    >
      <label
        htmlFor="promo-code-input"
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/65"
      >
        Insira seu código
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="promo-code-input"
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())
          }
          maxLength={64}
          placeholder="EX: BETALAUNCH2026"
          autoComplete="off"
          className="flex-1 rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-white placeholder:text-white/30 focus:border-l2-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {loading ? "Resgatando..." : "Ativar"}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-white/45">
        Apenas letras, números, _ e − (3 a 64 caracteres). Cada código só
        pode ser resgatado uma vez por conta.
      </p>
    </form>
  );
}
