"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type ActionKind = "reset-hwid";

export function AccountRowActions({ gameLogin }: { gameLogin: string }) {
  const router = useRouter();
  const { show } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState<ActionKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closeMenu = useCallback(() => setMenuRect(null), []);
  const openMenu = useCallback(() => {
    if (buttonRef.current) {
      setMenuRect(buttonRef.current.getBoundingClientRect());
    }
  }, []);

  // Fecha menu em ESC, scroll, resize ou click fora
  useEffect(() => {
    if (!menuRect) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !document.getElementById("account-row-menu")?.contains(target)
      ) {
        closeMenu();
      }
    }
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuRect, closeMenu]);

  // ESC fecha modal (quando não está em loading)
  useEffect(() => {
    if (!active) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) setActive(null);
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [active, loading]);

  function pickAction(kind: ActionKind) {
    closeMenu();
    setActive(kind);
  }

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
      show("HWID redefinido com sucesso", "success");
      setActive(null);
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (menuRect ? closeMenu() : openMenu())}
        aria-haspopup="menu"
        aria-expanded={menuRect !== null}
        className="rounded-md px-2 py-1 text-white/55 transition hover:bg-white/5 hover:text-white"
        title="Ações"
      >
        ⋯
      </button>

      {mounted &&
        menuRect &&
        createPortal(
          <div
            id="account-row-menu"
            role="menu"
            style={{
              position: "fixed",
              top: menuRect.bottom + 4,
              right: window.innerWidth - menuRect.right,
              zIndex: 60,
            }}
            className="w-56 overflow-hidden rounded-lg border border-white/10 bg-[color:var(--l2-bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          >
            <MenuItem
              icon="🔓"
              label="Redefinir HWID"
              onClick={() => pickAction("reset-hwid")}
            />
          </div>,
          document.body,
        )}

      {active === "reset-hwid" && (
        <ConfirmModal
          title="Redefinir HWID"
          confirmLabel="Confirmar"
          loading={loading}
          onCancel={() => setActive(null)}
          onConfirm={doResetHwid}
        >
          <p>
            Tem certeza que deseja redefinir o HWID da conta{" "}
            <strong className="font-display uppercase text-l2-gold">
              {gameLogin}
            </strong>
            ? Isso permite logar de outro computador. Limite: 1 vez por
            semana.
          </p>
        </ConfirmModal>
      )}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
        danger
          ? "text-l2-red hover:bg-l2-red/10"
          : "text-white/85 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ConfirmModal({
  title,
  children,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[color:var(--l2-bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="border-b border-white/5 px-6 py-4">
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            {title}
          </h3>
        </div>
        <div className="px-6 py-5 text-sm text-white/75">{children}</div>
        <div className="flex justify-end gap-3 border-t border-white/5 bg-black/30 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-white/10 bg-white/5 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
