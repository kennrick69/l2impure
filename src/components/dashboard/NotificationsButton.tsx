"use client";

import { useState, useRef, useEffect } from "react";

type Notification = {
  id: string;
  icon: string;
  title: string;
  description: string;
  createdAt: string; // formatted, ex: "5 min atrás"
};

export function NotificationsButton({
  initial = [],
}: {
  initial?: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items] = useState<Notification[]>(initial);
  const wrapRef = useRef<HTMLDivElement>(null);
  const unreadCount = items.length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-white"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-l2-red px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-white/8 bg-[color:var(--l2-bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Notificações
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-[10px] uppercase tracking-wider text-[color:var(--l2-text-gold)] hover:underline"
              >
                Marcar como lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mb-2 text-3xl opacity-30">🔕</div>
              <div className="text-xs text-white/55">
                Sem notificações por enquanto
              </div>
            </div>
          ) : (
            <ul className="max-h-[400px] overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 border-b border-white/5 px-4 py-3 text-sm last:border-0 hover:bg-white/3"
                >
                  <span className="text-base">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{n.title}</div>
                    <div className="text-xs text-white/55">{n.description}</div>
                    <div className="mt-1 text-[10px] text-white/35">
                      {n.createdAt}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
