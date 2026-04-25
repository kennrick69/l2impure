"use client";

import { useCreateAccountModal } from "./CreateAccountModal";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline" | "link";
};

const STYLES = {
  primary:
    "inline-flex items-center gap-2 rounded-md px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-black transition hover:opacity-90",
  outline:
    "inline-flex items-center gap-2 rounded-md border border-[color:var(--l2-border-gold)] bg-transparent px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)] transition hover:bg-[color:var(--l2-gold)]/10",
  link: "text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)] transition hover:underline",
};

/**
 * Botão client-side que abre o modal de criação de conta de jogo.
 * Usado em vários lugares (header CTA, dashboard placeholder, etc).
 */
export function CreateAccountTrigger({
  children,
  className,
  variant = "primary",
}: Props) {
  const { open } = useCreateAccountModal();
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--l2-gold-gradient)" }
      : {};
  return (
    <button
      type="button"
      onClick={open}
      style={style}
      className={className ?? STYLES[variant]}
    >
      {children}
    </button>
  );
}
