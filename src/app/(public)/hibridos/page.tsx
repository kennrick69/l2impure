import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Sistema de Híbridos — o único no mundo",
  description:
    "Funda 2 personagens level 78 num Híbrido com as skills das duas classes. Nenhum outro servidor de Lineage 2 no mundo tem isso. Entenda como funciona.",
  alternates: { canonical: "/hibridos" },
};

const STEPS = [
  {
    n: 1,
    title: "Suba 2 personagens ao level 78",
    text: "Qualquer dupla de classes da sua conta. No x10 com Auto-Farm, é uma jornada — não um grind infinito.",
  },
  {
    n: 2,
    title: "Funda os dois no Altar Impuro",
    text: "O ritual de fusão combina as duas linhagens num único personagem: o Híbrido.",
  },
  {
    n: 3,
    title: "Jogue com as skills das duas classes",
    text: "O Híbrido herda o arsenal das duas linhagens. Combos que o Lineage 2 nunca viu em 20 anos.",
  },
  {
    n: 4,
    title: "Dispute a Olympiad Híbrida",
    text: "Competição separada, só entre Híbridos. A Olympiad Normal continua clássica e intocada.",
  },
];

const BUILDS = [
  {
    name: "O Imortal",
    combo: "Duelist + Cardinal",
    desc: "Dual swords no rosto do inimigo — e se cura sozinho no meio do combo. O pesadelo de qualquer dagger.",
    icon: "⚔️",
  },
  {
    name: "O Maestro da Morte",
    combo: "Sagittarius + Sword Muse",
    desc: "Archer com as próprias songs. Range, dano crítico e defesa de bard no mesmo personagem.",
    icon: "🏹",
  },
  {
    name: "A Avalanche",
    combo: "Titan + Doomcryer",
    desc: "Frenzy + buffs próprios de orc shaman. O Titan que não depende de ninguém pra virar um trem descontrolado.",
    icon: "🪓",
  },
  {
    name: "O Ceifador",
    combo: "Soultaker + Adventurer",
    desc: "Necromancia com passo de dagger. Debuffa de longe, some, reaparece nas suas costas.",
    icon: "💀",
  },
];

const RULES = [
  {
    q: "O primeiro Híbrido é grátis",
    a: "Todo jogador tem direito a uma fusão gratuita. Híbridos seguintes custam recursos in-game (nunca doação) — poder não se compra no Impure.",
  },
  {
    q: "Olympiad separada",
    a: "Híbridos competem só entre si na Olympiad Híbrida. Quem quer Interlude clássico e puro joga a Olympiad Normal sem nunca cruzar com um Híbrido.",
  },
  {
    q: "Matriz de combinações curada",
    a: "Nem todo par de classes é permitido — combos degenerados são vetados. A matriz completa de fusões liberadas será publicada antes do beta.",
  },
  {
    q: "Rebalanceamento declarado",
    a: "Nas primeiras 4 semanas após o launch, Híbridos podem ser rebalanceados com base nos dados da Olympiad. Isso é regra pública desde já — sem nerf surpresa.",
  },
];

export default function HibridosPage() {
  return (
    <ContentPage
      eyebrow="🧬 Exclusivo mundial"
      title="Sistema de Híbridos"
      intro="Em 20 anos de Lineage 2, escolher classe sempre foi uma sentença. No L2 Impure, é só o começo: você funde 2 personagens level 78 num Híbrido com as skills das duas classes. Nenhum outro servidor no mundo — oficial ou privado — tem isso."
    >
      {/* Como funciona */}
      <div className="mb-14">
        <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wider text-white">
          Como funciona
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-5"
            >
              <div
                className="mb-2 flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-black"
                style={{ background: "var(--l2-gold-gradient)" }}
              >
                {s.n}
              </div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                {s.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Builds possíveis */}
      <div className="mb-14">
        <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wider text-white">
          O que vira possível
        </h2>
        <p className="mb-5 max-w-2xl text-sm text-white/55">
          Exemplos teóricos de fusões — a matriz final de combinações
          permitidas sai antes do beta. O teorycrafting é por sua conta.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {BUILDS.map((b) => (
            <div
              key={b.name}
              className="rounded-xl border border-l2-gold/25 bg-[color:var(--l2-bg-card)] p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                    {b.name}
                  </h3>
                  <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-l2-gold">
                    {b.combo}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/70">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regras do sistema */}
      <div className="mb-14">
        <h2 className="mb-5 font-display text-lg font-bold uppercase tracking-wider text-white">
          As regras do jogo
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {RULES.map((r) => (
            <ContentCard key={r.q} title={r.q}>
              <p>{r.a}</p>
            </ContentCard>
          ))}
        </div>
      </div>

      {/* Status honesto + CTA */}
      <ContentCard title="Status do sistema" icon="🛠️" highlight>
        <p>
          O Sistema de Híbridos está <strong>em desenvolvimento ativo</strong>{" "}
          e é o coração do nosso{" "}
          <Link href="/roadmap" className="underline text-l2-gold">
            roadmap até o launch de outubro
          </Link>
          . Ele será testado e balanceado num beta fechado antes de qualquer
          jogador tocar nele — a gente só abre o servidor com o Híbrido
          funcionando. Transparência total: acompanhe o progresso no{" "}
          <a
            href="https://discord.gg/pbGXNRuWVX"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-l2-gold"
          >
            Discord oficial
          </a>
          .
        </p>
        <p>
          <Link
            href="/register"
            className="mt-2 inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
            style={{ background: "var(--l2-gold-gradient)" }}
          >
            <span>🏅</span>
            <span>Criar conta de Fundador</span>
          </Link>
        </p>
      </ContentCard>
    </ContentPage>
  );
}
