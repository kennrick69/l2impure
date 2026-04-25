"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function UserActions({
  userId,
  email,
  banned,
  isAdmin,
}: {
  userId: number;
  email: string;
  banned: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function call(path: string, method: "POST" = "POST") {
    setBusy(true);
    try {
      const res = await fetch(path, { method });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha", "error");
        return;
      }
      router.refresh();
      return true;
    } catch {
      show("Erro de rede", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBan() {
    if (
      banned
        ? !confirm(`Desbanir ${email}?`)
        : !confirm(`Banir ${email}? Ele não vai conseguir mais logar.`)
    )
      return;
    const ok = await call(
      `/api/admin/users/${userId}/${banned ? "unban" : "ban"}`,
    );
    if (ok) show(banned ? "Usuário desbanido" : "Usuário banido", "success");
  }

  async function toggleAdmin() {
    if (
      isAdmin
        ? !confirm(`Remover privilégio admin de ${email}?`)
        : !confirm(`Promover ${email} a administrador?`)
    )
      return;
    const ok = await call(
      `/api/admin/users/${userId}/${isAdmin ? "demote" : "promote"}`,
    );
    if (ok) show(isAdmin ? "Removido admin" : "Promovido a admin", "success");
  }

  async function resetPassword() {
    if (!confirm(`Enviar email de reset de senha pra ${email}?`)) return;
    const ok = await call(`/api/admin/users/${userId}/reset-password`);
    if (ok) show("Email de reset enviado", "success");
  }

  return (
    <div className="inline-flex flex-wrap justify-end gap-1.5">
      <ActionBtn onClick={toggleBan} disabled={busy} variant={banned ? "ok" : "danger"}>
        {banned ? "Desbanir" : "Banir"}
      </ActionBtn>
      <ActionBtn onClick={toggleAdmin} disabled={busy}>
        {isAdmin ? "Remover admin" : "Promover"}
      </ActionBtn>
      <ActionBtn onClick={resetPassword} disabled={busy}>
        Reset senha
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
  variant,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "danger" | "ok";
}) {
  const colorClass =
    variant === "danger"
      ? "border-l2-red/40 text-l2-red hover:bg-l2-red/10"
      : variant === "ok"
        ? "border-l2-green/40 text-l2-green hover:bg-l2-green/10"
        : "border-white/10 text-white/75 hover:bg-white/5 hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wider transition disabled:opacity-50 ${colorClass}`}
    >
      {children}
    </button>
  );
}
