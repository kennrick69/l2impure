"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function PinSetupForm() {
  const router = useRouter();
  const { show } = useToast();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = /^\d{6}$/.test(pin);
  const matches = pin === confirm;
  const canSubmit = valid && matches && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gm/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao configurar PIN", "error");
        return;
      }
      show("PIN configurado e sessão liberada", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PinShell
      title="Defina seu PIN de GM"
      subtitle="Esse PIN trava o painel /admin/game-master. Use 6 dígitos numéricos."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <PinInput value={pin} onChange={setPin} label="PIN" autoFocus />
        <PinInput
          value={confirm}
          onChange={setConfirm}
          label="Confirmar PIN"
          error={
            confirm.length === 6 && !matches
              ? "Os PINs não coincidem"
              : undefined
          }
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "Salvando..." : "Configurar PIN"}
        </button>
        <p className="text-[10px] text-white/45">
          Anote em lugar seguro — não tem fluxo de "esqueci o PIN" no
          painel ainda. Pra resetar, peça pra outro admin ou rode SQL
          direto no Postgres pra apagar gm_pin_hash do seu user.
        </p>
      </form>
    </PinShell>
  );
}

export function PinUnlockForm() {
  const router = useRouter();
  const { show } = useToast();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = /^\d{6}$/.test(pin) && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gm/pin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "PIN incorreto", "error");
        setPin("");
        return;
      }
      show("Sessão GM liberada por 30 min", "success");
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PinShell
      title="Painel travado"
      subtitle="Insira seu PIN de GM pra liberar por 30 min."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <PinInput value={pin} onChange={setPin} label="PIN" autoFocus />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {busy ? "Validando..." : "Desbloquear"}
        </button>
        <p className="text-[10px] text-white/45">
          5 tentativas a cada 5 minutos.
        </p>
      </form>
    </PinShell>
  );
}

function PinShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-l2-red/30 bg-[color:var(--l2-bg-card)] p-6">
      <div className="mb-1 inline-flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red">
        🔒 {title}
      </div>
      <p className="mb-5 text-sm text-white/65">{subtitle}</p>
      {children}
    </div>
  );
}

function PinInput({
  value,
  onChange,
  label,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/65">
        {label}
      </label>
      <input
        type="password"
        inputMode="numeric"
        pattern="\d{6}"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        maxLength={6}
        placeholder="••••••"
        className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-3 text-center font-mono text-xl tracking-[0.5em] text-white focus:border-l2-gold focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-l2-red">{error}</p>}
    </div>
  );
}
