"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initial = email.charAt(0).toUpperCase();

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/5 bg-[color:var(--l2-bg-primary)]/95 px-6 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-[color:var(--l2-border-gold)] bg-[color:var(--l2-bg-card)] px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)] transition hover:bg-[color:var(--l2-bg-card-hover)]"
        >
          <span>➕</span> Criar conta no jogo
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Idioma"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-white"
        >
          🌐
        </button>
        <button
          type="button"
          title="Notificações"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-white"
        >
          🔔
        </button>
        <button
          type="button"
          onClick={logout}
          disabled={loading}
          title={`Sair (${email})`}
          className="ml-1 flex h-9 items-center gap-2 rounded-md border border-white/8 bg-[color:var(--l2-bg-card)] px-3 text-xs text-white/75 transition hover:border-white/20 hover:text-white disabled:opacity-50"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold uppercase text-black"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {initial}
          </span>
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
