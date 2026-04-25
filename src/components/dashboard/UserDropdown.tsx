"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function UserDropdown({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = email.charAt(0).toUpperCase();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-md border border-white/8 bg-[color:var(--l2-bg-card)] px-2 transition hover:border-white/20"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold uppercase text-black"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate text-xs text-white/75 sm:inline">
          {email}
        </span>
        <span className="text-[10px] text-white/40">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/8 bg-[color:var(--l2-bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        >
          <div className="border-b border-white/5 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Conta
            </div>
            <div className="mt-1 truncate text-xs text-white/85">{email}</div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            <span>⚙️</span>
            <span>Configurações</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/support");
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            <span>📞</span>
            <span>Suporte</span>
          </button>
          <div className="border-t border-white/5">
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-l2-red transition hover:bg-l2-red/10 disabled:opacity-50"
            >
              <span>🚪</span>
              <span>{loading ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
