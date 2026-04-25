"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CloseIcon } from "./icons";
import { downloadBlocks } from "@/lib/l2impure-data";

type Ctx = { open: () => void };
const PlayModalContext = createContext<Ctx>({ open: () => {} });

export function usePlayModal() {
  return useContext(PlayModalContext);
}

export function PlayModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <PlayModalContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-[color:var(--l2-bg-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center text-white/70 transition hover:text-white"
              onClick={() => setOpen(false)}
            >
              <CloseIcon className="h-6 w-6" />
            </button>

            <div className="px-6 pt-8 pb-8 md:px-10 md:pt-10">
              <h2 className="mb-8 text-center font-display text-2xl uppercase tracking-wider text-white md:text-3xl">
                Como Começar a Jogar?
              </h2>

              <div className="mb-5 rounded-lg border border-white/5 bg-black/30 px-5 py-4">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-[color:var(--l2-text-gold)]">
                    ETAPA 1:
                  </span>
                  <span className="font-display font-semibold uppercase tracking-wider text-white">
                    Criar uma Conta
                  </span>
                </div>
                <a
                  href="/register"
                  className="block w-full rounded-md bg-[var(--l2-gold-gradient)] px-5 py-3 text-center font-display text-sm font-semibold uppercase tracking-wider text-black transition hover:brightness-110"
                  style={{ background: "var(--l2-gold-gradient)" }}
                >
                  Registrar-se
                </a>
              </div>

              <div className="mb-5 rounded-lg border border-white/5 bg-black/30 px-5 py-4">
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <span className="text-[color:var(--l2-text-gold)]">
                    ETAPA 2:
                  </span>
                  <span className="font-display font-semibold uppercase tracking-wider text-white">
                    Baixe o Jogo
                  </span>
                </div>

                <div className="mb-3">
                  <div className="rounded-md bg-white/10 px-4 py-3 text-center font-display text-sm uppercase leading-tight tracking-wider text-white">
                    🔥 Lineage 2 Interlude
                    <br />
                    <small className="text-[color:var(--l2-text-gold)]">
                      X10
                    </small>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {downloadBlocks.map((block) => (
                    <div
                      key={block.title}
                      className="rounded-md border border-white/10 bg-black/40 p-4"
                    >
                      <div className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-white">
                        {block.title}
                      </div>
                      <div className="mb-3 text-[11px] uppercase tracking-wider text-white/50">
                        {block.subtitle}
                      </div>
                      <ul className="flex flex-col gap-2">
                        {block.links.map((l) => (
                          <li key={l.label}>
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 transition hover:bg-white/10 hover:text-white"
                            >
                              <span className="text-sm">{l.icon}</span>
                              <span>{l.label}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5 rounded-lg border border-white/5 bg-black/30 px-5 py-4">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-[color:var(--l2-text-gold)]">
                    ETAPA 3:
                  </span>
                  <span className="font-display font-semibold uppercase tracking-wider text-white">
                    Acesse o Jogo via{" "}
                    <span className="text-[color:var(--l2-text-gold)]">
                      system/l2.exe
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded bg-black/50 px-4 py-3 text-xs text-white/70">
                  <span>📁</span>
                  <span className="text-white/40">›</span>
                  <span>Este computador</span>
                  <span className="text-white/40">›</span>
                  <span>L2Impure</span>
                  <span className="text-white/40">›</span>
                  <span>system</span>
                  <span className="text-white/40">›</span>
                  <span className="text-[color:var(--l2-text-gold)]">
                    l2.exe
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center text-xs uppercase tracking-wider text-white/60">
                Precisa de ajuda?{" "}
                <a
                  href="/support"
                  className="text-[color:var(--l2-text-gold)] underline underline-offset-2 hover:no-underline"
                >
                  Entre em contato conosco
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </PlayModalContext.Provider>
  );
}
