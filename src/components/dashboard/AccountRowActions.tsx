"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function AccountRowActions({ gameLogin }: { gameLogin: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!confirming) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) setConfirming(false);
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [confirming, loading]);

  async function doResetHwid() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/game/accounts/${encodeURIComponent(gameLogin)}/reset-hwid`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "Falha ao redefinir HWID", "error");
        return;
      }
      show(`HWID de ${gameLogin} redefinido!`, "success");
      setConfirming(false);
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={wrapRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="rounded-md px-2 py-1 text-white/55 transition hover:bg-white/5 hover:text-white"
          title="Ações"
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-lg border border-white/10 bg-[color:var(--l2-bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirming(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
            >
              <span>🔓</span>
              <span>Redefinir HWID</span>
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setConfirming(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[color:var(--l2-bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="border-b border-white/5 px-6 py-4">
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                Redefinir HWID
              </h3>
            </div>
            <div className="px-6 py-5 text-sm text-white/75">
              <p className="mb-3">
                Vamos limpar o lock por IP da conta{" "}
                <strong className="font-display uppercase text-l2-gold">
                  {gameLogin}
                </strong>
                . Use isso se você ficou preso em outra máquina ou trocou
                de IP.
              </p>
              <p className="text-xs text-white/55">
                Você só pode redefinir o HWID uma vez por semana por conta.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/5 bg-black/30 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="rounded-md px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white/65 transition hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doResetHwid}
                disabled={loading}
                className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--l2-gold-gradient)" }}
              >
                {loading ? "Redefinindo..." : "Redefinir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
