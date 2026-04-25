"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function CreatePromoCodeForm() {
  const router = useRouter();
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [coins, setCoins] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          coins: Number(coins) || 0,
          maxUses: maxUses ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao criar", "error");
        return;
      }
      show(`Código ${code.toUpperCase()} criado`, "success");
      setCode("");
      setMaxUses("");
      setExpiresAt("");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Código">
        <input
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())
          }
          maxLength={64}
          minLength={3}
          required
          className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 font-mono text-sm uppercase text-white focus:border-l2-gold focus:outline-none"
          placeholder="EX: BETA2026"
        />
      </Field>
      <Field label="Coins (reward)">
        <input
          type="number"
          value={coins}
          onChange={(e) => setCoins(e.target.value)}
          min={1}
          className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
        />
      </Field>
      <Field label="Limite de usos (vazio = ∞)">
        <input
          type="number"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          min={1}
          className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
        />
      </Field>
      <Field label="Expira (vazio = nunca)">
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white focus:border-l2-gold focus:outline-none"
        />
      </Field>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={loading || !code}
          className="w-full rounded-md px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {loading ? "Criando..." : "Criar código"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
      {label}
      {children}
    </label>
  );
}
