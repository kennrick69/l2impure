"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, SVGProps } from "react";
import type { ServerStatus } from "@/lib/bridge";
import {
  HomeIcon,
  SwordsIcon,
  CoinsIcon,
  UsersIcon,
  GiftIcon,
  TrophyIcon,
  HeadsetIcon,
  SettingsIcon,
  CastleIcon,
  CaretDownIcon,
  DiscordIcon,
} from "@/components/icons";

type IconType = (props: SVGProps<SVGSVGElement>) => ReactElement;

type MenuItem = {
  href: string;
  Icon: IconType;
  label: string;
};

const MENU: MenuItem[] = [
  { href: "/dashboard", Icon: HomeIcon, label: "Página principal" },
  { href: "/characters", Icon: SwordsIcon, label: "Meus personagens" },
  { href: "/wallet", Icon: CoinsIcon, label: "Saldo" },
  { href: "/referrals", Icon: UsersIcon, label: "Indicações" },
  { href: "/promo-code", Icon: GiftIcon, label: "Código Promocional" },
  { href: "/rankings", Icon: TrophyIcon, label: "Classificação" },
  { href: "/support", Icon: HeadsetIcon, label: "Suporte" },
  { href: "/settings", Icon: SettingsIcon, label: "Configurações" },
];

export function Sidebar({
  serverStatus,
}: {
  serverStatus: ServerStatus | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-white/5 bg-[color:var(--l2-bg-secondary)] lg:w-[280px]">
      <div className="border-b border-white/5 px-5 py-4">
        <div className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/45">
          Seleção de Servidor
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-white/8 bg-[color:var(--l2-bg-input)] px-3 py-2 text-sm text-white/85 transition hover:border-white/20"
          aria-label="Trocar servidor (em breve)"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CastleIcon className="h-4 w-4 shrink-0 text-[color:var(--l2-text-gold)]" />
            <span className="truncate">Impure 10x (NOVO)</span>
          </span>
          <CaretDownIcon className="ml-2 shrink-0 text-white/40" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/45">
          Painel de Controle
        </div>
        <ul className="flex flex-col gap-0.5">
          {MENU.map((item) => {
            const active = isActive(item.href);
            const { Icon } = item;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "border-l-2 border-[color:var(--l2-text-gold)] bg-[color:var(--l2-bg-card)] pl-[10px] text-[color:var(--l2-text-gold)]"
                      : "text-white/75 hover:bg-[color:var(--l2-bg-card)]/60 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      active ? "" : "text-white/55"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/5 px-5 py-4">
        <div className="mb-3 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/45">
          Status dos Servidores
        </div>
        <ul className="flex flex-col gap-2 text-xs">
          <li className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-white/75">
              <CastleIcon className="h-4 w-4 shrink-0 text-white/45" />
              <span className="truncate">Impure 10x</span>
            </span>
            <ImpureStatusBadge status={serverStatus} />
          </li>
          <li>
            <a
              href="https://discord.gg/pbGXNRuWVX"
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-1 flex items-center justify-between rounded-md px-1 py-0.5 transition hover:bg-white/5"
            >
              <span className="flex items-center gap-2 text-white/75">
                <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
                <span>Discord</span>
              </span>
              <span className="flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-l2-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-l2-green opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-l2-green"></span>
                </span>
                Online
              </span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}

function ImpureStatusBadge({ status }: { status: ServerStatus | null }) {
  if (!status) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-display text-[10px] font-semibold uppercase tracking-wider text-white/35">
        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
        Indisponível
      </span>
    );
  }
  if (status.online) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-display text-[10px] font-semibold uppercase tracking-wider text-l2-green">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-l2-green opacity-75"></span>
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-l2-green"></span>
        </span>
        Online
        <span className="text-white/50 normal-case tracking-normal">
          · {status.players}
        </span>
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-display text-[10px] font-semibold uppercase tracking-wider text-l2-red">
      <span className="h-1.5 w-1.5 rounded-full bg-l2-red" />
      Offline
    </span>
  );
}
