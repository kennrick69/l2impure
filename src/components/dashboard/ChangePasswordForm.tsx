"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordForm() {
  const { show } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const newValid = next.length >= 8;
  const matches = next === confirm;
  const canSubmit = current.length > 0 && newValid && matches && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha ao trocar senha", "error");
        return;
      }
      show("Senha trocada com sucesso!", "success");
      setCurrent("");
      setNext("");
      setConfirm("");
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
      <h2 className="mb-1 font-display text-base font-semibold uppercase tracking-wider text-white">
        Trocar senha
      </h2>
      <p className="mb-5 text-xs text-white/55">
        Trocar a senha desconecta sessões em outros dispositivos.
      </p>

      <div className="flex flex-col gap-4">
        <PasswordField
          id="current"
          label="Senha atual"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <PasswordField
          id="new"
          label="Nova senha"
          hint="Mínimo 8 caracteres"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordField
          id="confirm"
          label="Confirmar nova senha"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
          error={
            confirm.length > 0 && !matches
              ? "As senhas não coincidem"
              : undefined
          }
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 inline-flex items-center justify-center rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "var(--l2-gold-gradient)" }}
      >
        {loading ? "Trocando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/65"
      >
        <span>{label}</span>
        {hint && (
          <span className="font-normal normal-case text-[10px] text-white/40">
            {hint}
          </span>
        )}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        required
        className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[color:var(--l2-text-gold)] focus:outline-none"
      />
      {error && (
        <p className="mt-1 text-xs text-[color:var(--l2-red)]">{error}</p>
      )}
    </div>
  );
}
