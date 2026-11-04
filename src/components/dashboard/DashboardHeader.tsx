"use client";

import Link from "next/link";
import { useCreateAccountModal } from "./CreateAccountModal";
import { UserDropdown } from "./UserDropdown";
import {
  HomeIcon,
  ForumIcon,
  HeartHandIcon,
  UserIcon,
  CoinsIcon,
  GlobeLineIcon,
  CaretDownIcon,
} from "@/components/icons";

const DISCORD_URL = "https://discord.gg/pbGXNRuWVX";

/**
 * Header fixa do painel — réplica do topo do L2MAD:
 *   [logo] [Site] [Fórum] [Doar] [Criar conta (pill)]  ···  [saldo] [idioma] [avatar+nome+email]
 * Mesma altura/enquadramento (barra ~70px, logo ~32px, nav bold + ícone de
 * linha, pill arredondada dourada, cluster direito compacto).
 */
export function DashboardHeader({
  email,
  isAdmin,
  balance,
}: {
  email: string;
  isAdmin: boolean;
  balance: number;
}) {
  const { open } = useCreateAccountModal();

  return (
    <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between gap-4 border-b border-white/5 bg-[color:var(--l2-bg-secondary)]/95 px-5 backdrop-blur lg:px-8">
      {/* Esquerda: logo + nav + CTA */}
      <div className="flex items-center gap-9">
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="L2Impure"
            className="h-[40px] w-auto select-none"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink href="/" Icon={HomeIcon} label="Site" />
          <NavLink href={DISCORD_URL} Icon={ForumIcon} label="Fórum" external />
          <NavLink href="/wallet" Icon={HeartHandIcon} label="Doar" />
        </nav>

        <button
          type="button"
          onClick={open}
          className="hidden items-center gap-2 rounded-[10px] px-7 py-3 font-display text-[15px] font-semibold text-white shadow-[0_2px_12px_rgba(245,130,10,0.35)] transition hover:brightness-110 sm:inline-flex"
          style={{
            background: "linear-gradient(180deg, #FBA532 0%, #F2870C 100%)",
          }}
        >
          <UserIcon className="h-[18px] w-[18px]" />
          <span>Criar uma conta</span>
        </button>
      </div>

      {/* Direita: saldo + idioma + avatar */}
      <div className="flex items-center gap-4 lg:gap-5">
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-white/5"
          title="Saldo de TOL"
        >
          <span className="font-display text-lg font-bold tabular-nums text-[color:var(--l2-text-gold)]">
            {balance}
          </span>
          <CoinsIcon className="h-5 w-5 text-[color:var(--l2-text-gold)]" />
        </Link>

        <LanguageSwitch />

        <UserDropdown email={email} isAdmin={isAdmin} />
      </div>
    </header>
  );
}

function NavLink({
  href,
  Icon,
  label,
  external,
}: {
  href: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  label: string;
  external?: boolean;
}) {
  const className =
    "flex items-center gap-2 text-[17px] font-semibold text-white/90 transition hover:text-[color:var(--l2-text-gold)]";
  const inner = (
    <>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

/** Seletor de idioma — visual igual ao do L2MAD. Só PT-BR por enquanto. */
function LanguageSwitch() {
  return (
    <button
      type="button"
      className="hidden items-center gap-1.5 text-sm text-white/70 transition hover:text-white sm:flex"
      aria-label="Idioma: Português (Brasil)"
    >
      <GlobeLineIcon className="h-[18px] w-[18px]" />
      <span className="font-medium uppercase tracking-wide">PT-BR</span>
      <CaretDownIcon className="text-white/40" />
    </button>
  );
}
