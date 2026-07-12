"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    title: "Administração",
    items: [
      { href: "/admin/dashboard", icon: "📊", label: "Dashboard" },
      { href: "/admin/users", icon: "👥", label: "Usuários" },
      { href: "/admin/promo-codes", icon: "🎁", label: "Códigos promocionais" },
      { href: "/admin/server", icon: "🖥️", label: "Servidor" },
      { href: "/admin/referrals", icon: "🔗", label: "Indicações" },
      { href: "/admin/announcements", icon: "📣", label: "Anúncios" },
      { href: "/admin/game-master", icon: "⚔️", label: "Game master" },
      { href: "/admin/gm-console", icon: "🕹️", label: "Console GM (fila)" },
      { href: "/admin/moderation/bans", icon: "🚫", label: "Moderação/Bans" },
      { href: "/admin/scheduled-broadcasts", icon: "⏰", label: "Broadcasts agendados" },
      { href: "/admin/online", icon: "🟢", label: "Jogadores online" },
      { href: "/admin/events/config", icon: "📅", label: "Eventos (config)" },
      { href: "/admin/characters", icon: "🧝", label: "Personagens" },
      { href: "/admin/items", icon: "💎", label: "Items (busca)" },
      { href: "/admin/npcs", icon: "🗿", label: "NPCs" },
      { href: "/admin/wallet", icon: "💰", label: "Carteira" },
      { href: "/admin/wallet/history", icon: "💰", label: "Wallet histórico" },
      { href: "/admin/audit-logs", icon: "📋", label: "Audit logs" },
      { href: "/admin/settings/secrets", icon: "🔐", label: "Secrets" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/marketing/vote-sites", icon: "🗳️", label: "Vote sites" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-white/5 bg-[color:var(--l2-bg-secondary)] lg:w-[260px]">
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? "mt-5" : undefined}>
            <div className="mb-2 px-2 font-display text-[10px] font-semibold uppercase tracking-[1.5px] text-l2-red">
              {group.title}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                        active
                          ? "border-l-2 border-l2-red bg-[color:var(--l2-bg-card)] pl-[10px] text-l2-red"
                          : "text-white/75 hover:bg-[color:var(--l2-bg-card)]/60 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
