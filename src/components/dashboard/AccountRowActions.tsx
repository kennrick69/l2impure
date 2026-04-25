"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type ActionKind = "reset-hwid" | "change-password" | "delete";

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
  const closeModal = useCallback(() => {
    if (!loading) setActive(null);
  }, [loading]);

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

  async function callApi(
    method: "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Falha na operação" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Erro de rede" };
    }
  }

  async function doResetHwid() {
    setLoading(true);
    const r = await callApi(
      "POST",
      `/api/game/accounts/${encodeURIComponent(gameLogin)}/reset-hwid`,
    );
    setLoading(false);
    if (!r.ok) {
      show(r.error ?? "Falha ao redefinir HWID", "error");
      return;
    }
    show("HWID redefinido com sucesso", "success");
    setActive(null);
    router.refresh();
  }

  async function doChangePassword(newPassword: string) {
    setLoading(true);
    const r = await callApi(
      "POST",
      `/api/game/accounts/${encodeURIComponent(gameLogin)}/change-password`,
      { password: newPassword },
    );
    setLoading(false);
    if (!r.ok) {
      show(r.error ?? "Falha ao trocar senha", "error");
      return;
    }
    show("Senha da conta de jogo trocada com sucesso", "success");
    setActive(null);
  }

  async function doDelete() {
    setLoading(true);
    const r = await callApi(
      "DELETE",
      `/api/game/accounts/${encodeURIComponent(gameLogin)}`,
    );
    setLoading(false);
    if (!r.ok) {
      show(r.error ?? "Falha ao excluir conta", "error");
      return;
    }
    show(`Conta ${gameLogin} excluída`, "success");
    setActive(null);
    router.refresh();
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
            <MenuButton
              icon="🔓"
              label="Redefinir HWID"
              onClick={() => pickAction("reset-hwid")}
            />
            <MenuButton
              icon="🔑"
              label="Trocar senha"
              onClick={() => pickAction("change-password")}
            />
            <MenuLink
              icon="⚔️"
              label="Ver personagens"
              href={`/characters?login=${encodeURIComponent(gameLogin)}`}
              onNavigate={closeMenu}
            />
            <div className="border-t border-white/5" />
            <MenuButton
              icon="🗑️"
              label="Excluir conta"
              onClick={() => pickAction("delete")}
              danger
            />
          </div>,
          document.body,
        )}

      {active === "reset-hwid" && (
        <ConfirmModal
          title="Redefinir HWID"
          confirmLabel="Confirmar"
          loading={loading}
          onCancel={closeModal}
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

      {active === "change-password" && (
        <ChangeGamePasswordModal
          gameLogin={gameLogin}
          loading={loading}
          onCancel={closeModal}
          onConfirm={doChangePassword}
        />
      )}

      {active === "delete" && (
        <DeleteAccountModal
          gameLogin={gameLogin}
          loading={loading}
          onCancel={closeModal}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}

function MenuButton({
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

function MenuLink({
  icon,
  label,
  href,
  onNavigate,
}: {
  icon: string;
  label: string;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5 hover:text-white"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

/* ---------------- Modals ---------------- */

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
    <ModalShell title={title} onCancel={onCancel} loading={loading}>
      <div className="px-6 py-5 text-sm text-white/75">{children}</div>
      <ModalFooter
        confirmLabel={confirmLabel}
        loading={loading}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmDisabled={false}
      />
    </ModalShell>
  );
}

function ChangeGamePasswordModal({
  gameLogin,
  loading,
  onCancel,
  onConfirm,
}: {
  gameLogin: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (newPassword: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const valid = pw.length >= 6 && pw.length <= 32;
  const matches = pw === confirm;
  const canSubmit = valid && matches && !loading;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (canSubmit) onConfirm(pw);
  }

  return (
    <ModalShell title="Trocar senha da conta" onCancel={onCancel} loading={loading}>
      <form onSubmit={onSubmit} className="px-6 py-5">
        <p className="mb-4 text-sm text-white/65">
          Defina uma nova senha pra{" "}
          <strong className="font-display uppercase text-l2-gold">
            {gameLogin}
          </strong>
          . É a senha de entrar no jogo, não a do site.
        </p>
        <div className="flex flex-col gap-4">
          <Field
            id="game-pw-new"
            label="Nova senha"
            hint="6 a 32 caracteres"
            value={pw}
            onChange={setPw}
            minLength={6}
            maxLength={32}
          />
          <Field
            id="game-pw-confirm"
            label="Confirmar senha"
            value={confirm}
            onChange={setConfirm}
            minLength={6}
            maxLength={32}
            error={confirm.length > 0 && !matches ? "As senhas não coincidem" : undefined}
          />
        </div>
        <ModalFooter
          confirmLabel="Trocar senha"
          loading={loading}
          onCancel={onCancel}
          onConfirm={() => canSubmit && onConfirm(pw)}
          confirmDisabled={!canSubmit}
          asSubmit
        />
      </form>
    </ModalShell>
  );
}

function DeleteAccountModal({
  gameLogin,
  loading,
  onCancel,
  onConfirm,
}: {
  gameLogin: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === gameLogin;
  return (
    <ModalShell
      title="Excluir conta de jogo"
      onCancel={onCancel}
      loading={loading}
      danger
    >
      <div className="px-6 py-5 text-sm">
        <p className="mb-4 rounded-md border border-l2-red/40 bg-l2-red/10 px-4 py-3 text-l2-red">
          <strong className="font-semibold">Esta ação é irreversível.</strong>{" "}
          Todos os personagens serão perdidos.
        </p>
        <p className="mb-4 text-white/75">
          Pra confirmar a exclusão de{" "}
          <strong className="font-display uppercase text-l2-gold">
            {gameLogin}
          </strong>
          , digite o login exatamente abaixo:
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder={gameLogin}
          className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-l2-red focus:outline-none"
        />
      </div>
      <ModalFooter
        confirmLabel="Excluir definitivamente"
        loading={loading}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmDisabled={!matches}
        danger
      />
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onCancel,
  loading,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  loading: boolean;
  danger?: boolean;
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
          <h3
            className={`font-display text-base font-bold uppercase tracking-wider ${
              danger ? "text-l2-red" : "text-white"
            }`}
          >
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
  confirmDisabled,
  danger,
  asSubmit,
}: {
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  danger?: boolean;
  asSubmit?: boolean;
}) {
  return (
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
        type={asSubmit ? "submit" : "button"}
        onClick={asSubmit ? undefined : onConfirm}
        disabled={loading || confirmDisabled}
        className={`rounded-md px-5 py-2 font-display text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${
          danger
            ? "bg-l2-red text-white hover:opacity-90"
            : "text-black"
        }`}
        style={
          danger
            ? undefined
            : { background: "var(--l2-gold-gradient)" }
        }
      >
        {loading ? "Aguarde..." : confirmLabel}
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  minLength,
  maxLength,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  maxLength?: number;
  error?: string;
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
        minLength={minLength}
        maxLength={maxLength}
        autoComplete="new-password"
        required
        className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-l2-gold focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-l2-red">{error}</p>}
    </div>
  );
}
