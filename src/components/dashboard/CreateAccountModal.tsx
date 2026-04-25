"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

// ---------- Context ----------

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CreateAccountModalContext = createContext<Ctx | null>(null);

export function useCreateAccountModal(): Ctx {
  const ctx = useContext(CreateAccountModalContext);
  if (!ctx) {
    throw new Error(
      "useCreateAccountModal precisa estar dentro de <CreateAccountModalProvider>",
    );
  }
  return ctx;
}

export function CreateAccountModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<Ctx>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );
  return (
    <CreateAccountModalContext.Provider value={value}>
      {children}
      {isOpen && <CreateAccountModal />}
    </CreateAccountModalContext.Provider>
  );
}

// ---------- Modal ----------

function CreateAccountModal() {
  const { close } = useCreateAccountModal();
  const router = useRouter();
  const { show } = useToast();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Esc fecha
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [close]);

  const loginValid = /^[a-zA-Z0-9]{4,16}$/.test(login);
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirm;
  const canSubmit = loginValid && passwordValid && passwordsMatch && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/game/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameLogin: login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(data.error ?? "Falha ao criar conta", "error");
        return;
      }
      show(`Conta ${login} criada!`, "success");
      close();
      router.refresh();
    } catch {
      show("Erro de rede", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/8 bg-[color:var(--l2-bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
            Criar Conta de Jogo
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-2xl leading-none text-white/45 transition hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col gap-5 px-6 py-5">
          <div className="rounded-md border border-white/5 bg-[color:var(--l2-bg-card)] px-4 py-3 text-xs text-white/65">
            <span className="font-semibold text-[color:var(--l2-text-gold)]">
              Servidor:
            </span>{" "}
            🏰 Bartz · Interlude x10
          </div>

          {/* Login */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/65">
              <span>Login da conta</span>
              <span className="font-normal normal-case text-[10px] text-white/40">
                4-16 caracteres, letras e números
              </span>
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) =>
                setLogin(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
              }
              maxLength={16}
              minLength={4}
              placeholder="meulogin"
              required
              autoFocus
              autoComplete="off"
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[color:var(--l2-text-gold)] focus:outline-none"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/65">
              <span>Senha da conta de jogo</span>
              <span className="font-normal normal-case text-[10px] text-white/40">
                Mínimo 6 caracteres
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              maxLength={32}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[color:var(--l2-text-gold)] focus:outline-none"
            />
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/65">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              maxLength={32}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[color:var(--l2-text-gold)] focus:outline-none"
            />
            {confirm && !passwordsMatch && (
              <p className="mt-1 text-xs text-[color:var(--l2-red)]">
                As senhas não coincidem
              </p>
            )}
          </div>

          {/* Aviso */}
          <div className="rounded-md border border-[color:var(--l2-border-gold)]/30 bg-[color:var(--l2-gold)]/5 p-3 text-xs text-white/65">
            <span className="font-semibold text-[color:var(--l2-text-gold)]">
              ⚠️ Atenção:
            </span>{" "}
            Esta é a senha pra entrar no <strong>jogo</strong>, não no site.
            Anote em lugar seguro — não dá pra recuperar pelo painel ainda.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md py-3 font-display text-sm font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            {loading ? "Criando..." : "Criar Conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
