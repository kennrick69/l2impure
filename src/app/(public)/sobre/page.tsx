import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Sobre o L2 Impure — Manifesto",
  description:
    "Quem faz o L2 Impure, por que ele existe e as promessas invioláveis: retail Interlude + Híbridos opcionais, sem P2W, staff transparente e infraestrutura séria.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <ContentPage
      eyebrow="🏛️ Manifesto"
      title="Sobre o L2 Impure"
      intro="Somos jogadores da era 2004-2012 que cansaram de esperar alguém fazer o servidor que a gente queria jogar. Então fizemos."
    >
      <div className="mb-14 flex flex-col gap-5">
        <ContentCard title="Por que mais um servidor de Interlude?" icon="🎯">
          <p>
            Não é mais um. Todo Interlude x10 do mercado vende a mesma
            nostalgia com embalagem diferente. O Impure existe por causa de
            uma ideia que nenhum servidor do mundo teve coragem de construir:
            o{" "}
            <Link href="/hibridos" className="underline text-l2-gold">
              Sistema de Híbridos
            </Link>{" "}
            — fundir duas classes level 78 num personagem só. A nostalgia é a
            porta de entrada; o Híbrido é o motivo de ficar.
          </p>
        </ContentCard>

        <ContentCard title="Filosofia de design" icon="🧭">
          <p>
            <strong>Retail Interlude + camada custom opt-in.</strong> Quem
            quer o clássico puro, joga o clássico puro — o Híbrido é endgame
            opcional com Olympiad separada, e não contamina o jogo base. As
            conveniências (Auto-Farm oficial, Rebirth, eventos 24/7) tiram o
            sofrimento artificial, não o desafio.
          </p>
          <p>
            <strong>Poder não se vende.</strong> A loja é cosmética. O
            servidor se paga com doações voluntárias e a meta de custo do mês
            será pública no site — doação aqui é ato de comunidade, não
            atalho de poder.
          </p>
        </ContentCard>

        <ContentCard title="Quem faz" icon="👥">
          <p>
            Staff brasileira, servidor hospedado com ping ~30ms pro Brasil, e
            uma regra de ouro: <strong>GM não joga competitivamente com
            personagem oculto</strong>. Somos uma equipe enxuta de
            desenvolvimento e administração — e crescemos com moderadores
            voluntários da própria comunidade conforme o servidor cresce.
            Você fala com a gente direto no{" "}
            <a
              href="https://discord.gg/pbGXNRuWVX"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-l2-gold"
            >
              Discord
            </a>
            , sem intermediário.
          </p>
        </ContentCard>

        <ContentCard title="Infraestrutura séria" icon="🏗️">
          <p>
            Backup do mundo a cada 4 horas com cópia externa e teste de
            restauração mensal. Proteção anti-cheat no client. Site e conta
            protegidos com criptografia de ponta a ponta. Servidor privado
            que perde progresso dos jogadores morre — e a gente construiu
            pra não morrer.
          </p>
        </ContentCard>

        <ContentCard title="Promessas invioláveis" icon="🔒">
          <ul className="list-none space-y-2">
            {[
              "Rates x10 pra sempre — mudança só via votação pública",
              "Sem wipe pós-launch, nunca",
              "Loja nunca vende poder — nem \"só dessa vez\"",
              "Changelog público de toda mudança",
              "Bans de bot publicados em números",
            ].map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-l2-gold">›</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      </div>

      <ContentCard title="Faça parte da história" icon="🏅" highlight>
        <p>
          O servidor abre em outubro de 2026 —{" "}
          <Link href="/roadmap" className="underline text-l2-gold">
            roadmap público aqui
          </Link>
          . Quem criar conta antes do launch entra pro jogo com o título
          permanente de Fundador.{" "}
          <Link href="/register" className="underline text-l2-gold">
            Registre-se grátis
          </Link>
          .
        </p>
      </ContentCard>
    </ContentPage>
  );
}
