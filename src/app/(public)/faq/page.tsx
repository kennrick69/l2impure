import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "FAQ — Perguntas Frequentes",
  description:
    "Chronicle, rates, Sistema de Híbridos, política de wipe, anti-bot e cash shop: as respostas diretas que todo jogador de Lineage 2 quer antes de entrar.",
  alternates: { canonical: "/faq" },
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Qual a chronicle e os rates?",
    a: (
      <p>
        Interlude (C6) clássico, rates x10: XP, SP, Drop e Adena x10, Spoil
        x10, Raid Boss x5. Mid-rate de verdade — casual o bastante pra quem
        trabalha, longo o bastante pra valer meses de jogo.
      </p>
    ),
  },
  {
    q: "O que é o Sistema de Híbridos?",
    a: (
      <p>
        O diferencial único do Impure: você funde 2 personagens level 78 num
        Híbrido com as skills das duas classes. O primeiro é grátis, a
        Olympiad Híbrida é separada da Normal, e nenhum outro servidor no
        mundo tem isso.{" "}
        <Link href="/hibridos" className="underline text-l2-gold">
          Explicação completa aqui
        </Link>
        .
      </p>
    ),
  },
  {
    q: "É custom demais? Eu só quero Interlude clássico.",
    a: (
      <p>
        O jogo base é retail Interlude. O Híbrido é conteúdo de endgame{" "}
        <strong>opcional</strong>, com Olympiad própria e separada — quem
        quer o clássico puro joga sem nunca esbarrar num Híbrido em
        competição. As camadas custom (Auto-Farm, Rebirth, eventos) são
        qualidade de vida, não mudança de jogo.
      </p>
    ),
  },
  {
    q: "Quando abre?",
    a: (
      <p>
        Launch previsto pra <strong>outubro de 2026</strong>, numa
        sexta-feira às 19h (horário de Brasília), com beta aberto semanas
        antes. A data exata será cravada ao final do beta fechado — o
        servidor só abre com o Híbrido testado. Acompanhe o{" "}
        <Link href="/roadmap" className="underline text-l2-gold">
          roadmap público
        </Link>
        .
      </p>
    ),
  },
  {
    q: "Vai ter wipe depois do launch?",
    a: (
      <p>
        <strong>Não.</strong> Wipe só existe no beta (anunciado desde o dia
        1). Depois do launch, seu progresso é permanente — sem wipe, sem
        aumento de rate "pra reativar o servidor", sem mudança de regra no
        meio do jogo. Rates são contrato: qualquer mudança só via votação
        pública da comunidade.
      </p>
    ),
  },
  {
    q: "Tem pay-to-win? O que a loja vende?",
    a: (
      <p>
        Zero P2W, e isso é verificável: a loja vende <strong>apenas</strong>{" "}
        cosméticos (skins, cor de nome, títulos, pets visuais) e
        conveniências sem poder. Nunca: XP, enchant, itens de grade, stats ou
        vantagem de Híbrido. Doações existem pra pagar o servidor — a meta de
        custo do mês será pública no site.
      </p>
    ),
  },
  {
    q: "E bots? Como o servidor se protege?",
    a: (
      <p>
        Dupla camada. Primeiro: o Auto-Farm oficial é grátis pra todos — aqui
        ninguém "precisa" de bot pra competir. Segundo: proteção anti-cheat
        ativa no client + política pública de ban permanente pra bot de
        verdade, com denúncias comprovadas tratadas em menos de 24h e números
        de ban publicados. GM nunca joga competitivamente com personagem
        oculto.
      </p>
    ),
  },
  {
    q: "Preciso pagar pra jogar?",
    a: (
      <p>
        Não. O jogo é 100% grátis: cliente grátis, Auto-Farm grátis, primeiro
        Híbrido grátis.{" "}
        <Link href="/register" className="underline text-l2-gold">
          Crie sua conta
        </Link>{" "}
        antes do launch e ganhe de brinde o título permanente de Fundador.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      eyebrow="❓ Respostas diretas"
      title="Perguntas Frequentes"
      intro="As perguntas que todo jogador de L2 experiente faz antes de investir tempo num servidor novo — respondidas sem enrolação."
    >
      <div className="mb-14 flex flex-col gap-5">
        {FAQ.map((f) => (
          <ContentCard key={f.q} title={f.q}>
            {f.a}
          </ContentCard>
        ))}
      </div>

      <ContentCard title="Ficou dúvida?" icon="💬" highlight>
        <p>
          Pergunta direto pra staff no{" "}
          <a
            href="https://discord.gg/pbGXNRuWVX"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-l2-gold"
          >
            Discord oficial
          </a>{" "}
          — tem canal de suporte com resposta em até 24h úteis.
        </p>
      </ContentCard>
    </ContentPage>
  );
}
