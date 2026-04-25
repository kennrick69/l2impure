import { ArrowUpRightIcon, DiscordIcon, TelegramIcon } from "./icons";
import { serverCards, newsItems } from "@/lib/l2impure-data";

function SectionHeader({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="text-lg">{icon}</span>
      <h2 className="font-display text-[15px] font-bold uppercase tracking-[1.5px] text-white md:text-base">
        {children}
      </h2>
    </div>
  );
}

function ServerList() {
  return (
    <div>
      <SectionHeader icon="🔥">Status dos Servidores</SectionHeader>
      <div className="flex flex-col gap-3">
        {serverCards.map((s) => (
          <a
            key={s.name}
            href={s.href || "#"}
            target={s.href ? "_blank" : undefined}
            rel={s.href ? "noopener noreferrer" : undefined}
            className={`group flex items-center justify-between gap-4 rounded-xl border bg-[color:var(--l2-bg-card)] px-5 py-4 transition hover:bg-[color:var(--l2-bg-card-hover)] ${
              s.accent === "gold"
                ? "border-[color:var(--l2-border-gold)]"
                : "border-white/5"
            }`}
          >
            <div className="flex items-center gap-4">
              {s.rate === "DISCORD" ? (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: "rgb(var(--l2-discord))" }}
                >
                  <DiscordIcon className="h-6 w-6" />
                </span>
              ) : (
                <span
                  className="flex h-11 min-w-[3.5rem] items-center justify-center rounded-lg px-3 font-display text-lg font-bold uppercase text-black"
                  style={{ background: "var(--l2-gold-gradient)" }}
                >
                  {s.rate}
                </span>
              )}
              <div className="flex flex-col">
                <span className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                  {s.name}
                </span>
                <span className="text-xs text-white/55">{s.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.status === "online" && (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--l2-green)] shadow-[0_0_8px_rgb(var(--l2-green))]" />
                  <span className="font-display text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-green)]">
                    {s.statusText}
                  </span>
                </span>
              )}
              {s.status === "coming-soon" && (
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)]">
                  {s.statusText}
                </span>
              )}
              <ArrowUpRightIcon className="h-3 w-3 text-white/30 transition group-hover:text-white/70" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function NewsCard() {
  return (
    <div>
      <SectionHeader icon="⚡">Últimas Notícias</SectionHeader>
      <div className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/5 pb-4">
          <span className="text-xs text-white/55">
            L2IMPURE.COM - Servidor Brasileiro de Lineage 2 Interlude
          </span>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 transition hover:text-white"
          >
            <TelegramIcon className="h-4 w-4" />
          </a>
        </div>
        <ul className="flex flex-col gap-3">
          {newsItems.map((n, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/85">
              <span className="mt-0.5 shrink-0">{n.icon}</span>
              <p
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: n.html }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MainContent() {
  return (
    <section className="relative py-14 md:py-20">
      <div className="l2-container">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <ServerList />
          <NewsCard />
        </div>
      </div>
    </section>
  );
}
