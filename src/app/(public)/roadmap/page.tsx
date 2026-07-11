import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Roadmap até o Launch | L2 Impure",
  description:
    "Roadmap público do L2 Impure: Sistema de Híbridos, beta fechado, beta aberto e launch previsto pra outubro de 2026. Acompanhe cada marco.",
  alternates: { canonical: "/roadmap" },
};

type Milestone = {
  period: string;
  title: string;
  status: "doing" | "next" | "planned";
  items: string[];
};

const MILESTONES: Milestone[] = [
  {
    period: "Julho — Agosto",
    title: "Fundação: o mês do Híbrido",
    status: "doing",
    items: [
      "Desenvolvimento do Sistema de Híbridos no core do servidor",
      "Matriz de combinações de classes definida e publicada",
      "Proteção anti-bot/anti-cheat integrada e testada",
      "Client + patch preparados para distribuição",
      "Rotina de backup do mundo a cada 4 horas, testada",
    ],
  },
  {
    period: "Final de Agosto — Setembro",
    title: "Beta fechado",
    status: "next",
    items: [
      "Beta fechado com testers recrutados no Discord (2-3 semanas)",
      "Foco: balance dos Híbridos, economia x10, Auto-Farm e stress de login",
      "Recompensa de tester: título exclusivo + cosmético permanente no launch",
      "Tudo do beta será apagado — wipe garantido e anunciado desde o dia 1",
    ],
  },
  {
    period: "Final de Setembro",
    title: "Beta aberto + data cravada",
    status: "planned",
    items: [
      "Beta aberto pra qualquer um testar o servidor e os Híbridos",
      "Anúncio da data e hora exatas do launch",
      "Trailer com gameplay real da fusão de classes",
      "Contagem regressiva no site e no Discord",
    ],
  },
  {
    period: "Outubro de 2026 · sexta-feira · 19h (BRT)",
    title: "🔥 LAUNCH",
    status: "planned",
    items: [
      "Servidor limpo — todo mundo começa do zero, inclusive a staff",
      "Título permanente de Fundador pra quem criou conta antes do launch",
      "Evento de abertura: corrida ao primeiro Híbrido do servidor — o vencedor ganha estátua com o próprio nome em Giran",
      "Buff de XP +20% nos primeiros 7 dias (evento temporário e anunciado)",
      "TvT de estreia no primeiro sábado à noite",
    ],
  },
];

const STATUS_LABEL: Record<Milestone["status"], { label: string; cls: string }> = {
  doing: { label: "EM ANDAMENTO", cls: "bg-l2-gold/15 text-l2-gold" },
  next: { label: "PRÓXIMO", cls: "bg-white/10 text-white/80" },
  planned: { label: "PLANEJADO", cls: "bg-white/5 text-white/50" },
};

export default function RoadmapPage() {
  return (
    <ContentPage
      eyebrow="🗺️ Transparência total"
      title="Roadmap até o Launch"
      intro="Este é o plano público até a abertura do servidor, prevista pra outubro de 2026. Uma regra acima de todas: o L2 Impure só abre com o Sistema de Híbridos funcionando e testado. Se precisar de mais tempo, a data move — a promessa não."
    >
      <div className="mb-14 flex flex-col gap-5">
        {MILESTONES.map((m) => {
          const s = STATUS_LABEL[m.status];
          return (
            <div
              key={m.title}
              className={`rounded-xl border p-6 ${
                m.status === "doing"
                  ? "border-l2-gold/40 bg-l2-gold/5"
                  : "border-white/5 bg-[color:var(--l2-bg-card)]"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-display text-[11px] font-semibold uppercase tracking-[2px] text-white/50">
                    {m.period}
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold uppercase tracking-wider text-white">
                    {m.title}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider ${s.cls}`}
                >
                  {s.label}
                </span>
              </div>
              <ul className="space-y-2">
                {m.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-white/75"
                  >
                    <span className="mt-0.5 shrink-0 text-l2-gold">›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <ContentCard title="Enquanto isso, garanta seu lugar" icon="🏅" highlight>
        <p>
          Toda conta criada antes do launch recebe o título permanente de{" "}
          <strong>Fundador</strong> — exclusivo, cosmético e nunca mais
          disponível depois da abertura.{" "}
          <Link href="/register" className="underline text-l2-gold">
            Crie sua conta grátis
          </Link>{" "}
          e entre no{" "}
          <a
            href="https://discord.gg/pbGXNRuWVX"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-l2-gold"
          >
            Discord
          </a>{" "}
          pra acompanhar cada marco deste roadmap sendo cumprido.
        </p>
      </ContentCard>
    </ContentPage>
  );
}
