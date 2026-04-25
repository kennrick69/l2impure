"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  href: string;
  icon: string;
  label: string;
  badge?: string;
};

const MENU: MenuItem[] = [
  { href: "/dashboard", icon: "🏠", label: "Página principal" },
  { href: "/characters", icon: "⚔️", label: "Meus personagens" },
  { href: "/warehouse", icon: "📦", label: "Meu depósito" },
  { href: "/wallet", icon: "💰", label: "Saldo", badge: "0" },
  { href: "/referrals", icon: "👥", label: "Indicações" },
  { href: "/promo-code", icon: "🎁", label: "Código Promocional" },
  { href: "/rankings", icon: "🏆", label: "Classificação" },
  { href: "/support", icon: "📞", label: "Suporte" },
  { href: "/settings", icon: "⚙️", label: "Configurações" },
];

export function Sidebar() {
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
          <span className="truncate">🏰 Bartz · Interlude x10 (NOVO)</span>
          <span className="ml-2 text-white/40">▼</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-white/45">
          Painel de Controle
        </div>
        <ul className="flex flex-col gap-0.5">
          {MENU.map((item) => {
            const active = isActive(item.href);
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
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/65">
                      {item.badge}
                    </span>
                  )}
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
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white/75">
              <span>🏰</span>
              <span>Bartz · x10 NOVO</span>
            </span>
            <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)]">
              Em Breve
            </span>
          </li>
          <li>
            <a
              href="https://discord.gg/pbGXNRuWVX"
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-1 flex items-center justify-between rounded-md px-1 py-0.5 transition hover:bg-white/5"
            >
              <span className="flex items-center gap-2 text-white/75">
                <span>⚔️</span>
                <span>Discord</span>
              </span>
              <span className="flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-[color:var(--l2-green)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--l2-green)] opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--l2-green)]"></span>
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
