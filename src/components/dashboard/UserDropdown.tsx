"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CaretDownIcon,
  ShieldIcon,
  SettingsIcon,
  HeadsetIcon,
  LogOutIcon,
} from "@/components/icons";

/** "kennrick@gmail.com" -> "Kennrick" (nome de exibição derivado do e-mail). */
function displayName(email: string): string {
  const local = email.split("@")[0] || email;
  const first = local.split(/[._-]/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** "kennrick@gmail.com" -> "ke***********com" (igual ao mascaramento do MAD). */
function maskEmail(email: string): string {
  if (email.length <= 5) return email;
  return `${email.slice(0, 2)}***********${email.slice(-3)}`;
}

export function UserDropdown({
  email,
  isAdmin = false,
}: {
  email: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = email.charAt(0).toUpperCase();
  const name = displayName(email);
  const masked = maskEmail(email);

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
        className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition hover:bg-white/5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold uppercase text-black ring-2 ring-white/10"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          {initial}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[150px] truncate text-[13px] font-semibold text-white">
            {name}
          </span>
          <span className="max-w-[150px] truncate text-[11px] text-white/45">
            {masked}
          </span>
        </span>
        <CaretDownIcon className="text-white/40" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/8 bg-[color:var(--l2-bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold uppercase text-black"
              style={{ background: "var(--l2-gold-gradient)" }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {name}
              </div>
              <div className="truncate text-[11px] text-white/45">{email}</div>
            </div>
          </div>
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 text-sm text-l2-red transition hover:bg-l2-red/10"
            >
              <ShieldIcon className="h-4 w-4 shrink-0" />
              <span>Painel admin</span>
            </Link>
          )}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            <SettingsIcon className="h-4 w-4 shrink-0 opacity-80" />
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
            <HeadsetIcon className="h-4 w-4 shrink-0 opacity-80" />
            <span>Suporte</span>
          </button>
          <div className="border-t border-white/5">
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-l2-red transition hover:bg-l2-red/10 disabled:opacity-50"
            >
              <LogOutIcon className="h-4 w-4 shrink-0" />
              <span>{loading ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
