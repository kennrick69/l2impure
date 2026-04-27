"use client";

import Link from "next/link";
import { useCreateAccountModal } from "./CreateAccountModal";
import { UserDropdown } from "./UserDropdown";
import { NotificationsButton } from "./NotificationsButton";

export function DashboardHeader({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const { open } = useCreateAccountModal();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/5 bg-[color:var(--l2-bg-secondary)] px-5 lg:px-6">
      {/* Esquerda: logo + CTA criar conta */}
      <div className="flex items-center gap-5">
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="L2 Impure"
            className="h-[70px] w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={open}
          className="hidden items-center gap-2 rounded-md px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-black transition hover:opacity-90 sm:inline-flex"
          style={{ background: "var(--l2-gold-gradient)" }}
        >
          <span>➕</span>
          <span>Criar conta no jogo</span>
        </button>
      </div>

      {/* Direita: notificações + avatar */}
      <div className="flex items-center gap-2">
        <NotificationsButton />
        <UserDropdown email={email} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
