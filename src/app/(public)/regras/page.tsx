import type { Metadata } from "next";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Regras do Servidor | L2 Impure",
  description:
    "Regras públicas do L2 Impure: política anti-bot, conduta de staff, rates como contrato e o que dá ban. Curtas, claras e iguais pra todo mundo.",
  alternates: { canonical: "/regras" },
};

export default function RegrasPage() {
  return (
    <ContentPage
      eyebrow="⚖️ Iguais pra todo mundo"
      title="Regras do Servidor"
      intro="Poucas regras, aplicadas sempre. O que mata servidor privado não é regra dura — é regra aplicada pra uns e não pra outros. Aqui a régua é uma só."
    >
      <div className="mb-14 flex flex-col gap-5">
        <ContentCard title="1. Bot e automação externa" icon="🤖">
          <p>
            O Auto-Farm oficial integrado no cliente é <strong>grátis e
            liberado pra todos</strong> — esse é o farm justo do Impure.
            Programas externos de automação (Adrenaline, L2Tower e
            similares), exploits e dupes dão <strong>ban permanente da
            conta</strong>, sem apelação quando houver prova em vídeo ou
            registro da proteção anti-cheat.
          </p>
          <p>
            Denúncias com prova são tratadas em até 24h e toda leva de bans é
            publicada em números no Discord. A reputação anti-bot deste
            servidor se constrói em público.
          </p>
        </ContentCard>

        <ContentCard title="2. RMT — venda de itens por dinheiro real" icon="💸">
          <p>
            Comprar ou vender adena, itens ou contas por dinheiro real fora
            da loja oficial dá ban permanente — pro comprador E pro vendedor.
            "Sem P2W" só é verdade se valer também pro mercado paralelo, e a
            economia é auditada semanalmente.
          </p>
        </ContentCard>

        <ContentCard title="3. Conduta da staff (regras pra gente também)" icon="🛡️">
          <p>
            GM não joga competitivamente com personagem oculto. GM não dá
            item, level ou vantagem pra ninguém — nem pra amigo. Todo update
            de balance sai em changelog público, por menor que seja. Rollback
            por bug é comunicado em até 15 minutos e compensado igualmente
            pra todos, nunca caso a caso no privado.
          </p>
        </ContentCard>

        <ContentCard title="4. Rates e wipes são contrato" icon="📜">
          <p>
            x10 anunciado é x10 pra sempre — mudança de rate só via votação
            pública da comunidade. Não existe wipe pós-launch. O único wipe
            da história do servidor é o do beta, anunciado desde o primeiro
            dia.
          </p>
        </ContentCard>

        <ContentCard title="5. Híbridos: janela de balance declarada" icon="🧬">
          <p>
            Nas primeiras 4 semanas após o launch, combinações de Híbridos
            podem ser rebalanceadas com base em dados reais da Olympiad
            Híbrida. Ajustes saem em janela fixa (toda quarta-feira), com
            changelog — nunca nerf surpresa de madrugada.
          </p>
        </ContentCard>

        <ContentCard title="6. Convivência" icon="🤝">
          <p>
            PvP, PK e rivalidade fazem parte do Lineage 2 e são bem-vindos.
            O que não passa: doxxing, ameaça fora do jogo, discurso de ódio e
            golpe/scam entre jogadores. No jogo vale ser vilão; fora dele,
            não.
          </p>
        </ContentCard>
      </div>

      <ContentCard title="Transparência" icon="🔍" highlight>
        <p>
          Estas regras são públicas e versionadas. Qualquer mudança será
          anunciada no Discord antes de valer — regra que muda em silêncio
          não é regra, é armadilha.
        </p>
      </ContentCard>
    </ContentPage>
  );
}
