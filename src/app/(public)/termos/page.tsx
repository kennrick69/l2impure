import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Termos de Serviço | L2 Impure",
  description:
    "Termos de uso do L2 Impure: conta, conduta, doações, disponibilidade do serviço e propriedade intelectual.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <ContentPage
      eyebrow="📜 Legal"
      title="Termos de Serviço"
      intro="Última atualização: julho de 2026. Ao criar uma conta ou jogar no L2 Impure você concorda com estes termos."
    >
      <div className="flex flex-col gap-5">
        <ContentCard title="1. O serviço">
          <p>
            O L2 Impure é um servidor comunitário e gratuito de Lineage 2
            Interlude, operado por fãs, sem afiliação com a NCSoft. O acesso
            é gratuito e nenhum pagamento é necessário pra jogar.
          </p>
        </ContentCard>
        <ContentCard title="2. Sua conta">
          <p>
            Você é responsável por manter sua senha segura. Contas são
            pessoais e intransferíveis; venda ou compartilhamento de conta
            pode resultar em suspensão. Uma pessoa pode ter múltiplas contas
            de jogo dentro dos limites publicados nas{" "}
            <Link href="/regras" className="underline text-l2-gold">
              Regras
            </Link>
            .
          </p>
        </ContentCard>
        <ContentCard title="3. Conduta">
          <p>
            Valem as{" "}
            <Link href="/regras" className="underline text-l2-gold">
              Regras do Servidor
            </Link>{" "}
            — em especial: proibição de bots externos, exploits, RMT e
            assédio fora do jogo. Violações podem resultar em suspensão ou
            banimento permanente sem reembolso de doações.
          </p>
        </ContentCard>
        <ContentCard title="4. Doações">
          <p>
            Doações são voluntárias, destinadas ao custeio da infraestrutura,
            e dão acesso apenas a itens cosméticos ou de conveniência sem
            poder. Doação não compra imunidade a regra. Valores doados não
            são reembolsáveis, exceto quando exigido por lei.
          </p>
        </ContentCard>
        <ContentCard title="5. Disponibilidade e progresso">
          <p>
            Operamos com backups a cada 4 horas e melhor esforço de uptime,
            mas o serviço é fornecido "como está", sem garantia de
            disponibilidade contínua. Em caso de falha técnica, o progresso
            pode ser restaurado ao último backup válido, com compensação
            igual pra todos os afetados.
          </p>
        </ContentCard>
        <ContentCard title="6. Propriedade intelectual">
          <p>
            Lineage 2 e suas marcas pertencem à NCSoft. O L2 Impure é um
            projeto de comunidade sem fins de exploração da marca. Os
            sistemas originais do Impure (incluindo o Sistema de Híbridos) e
            este site são obra da equipe do projeto.
          </p>
        </ContentCard>
        <ContentCard title="7. Mudanças nestes termos">
          <p>
            Alterações serão anunciadas no Discord oficial e nesta página
            antes de entrarem em vigor. Contato:{" "}
            <a href="mailto:admin@l2impure.com" className="underline text-l2-gold">
              admin@l2impure.com
            </a>
            .
          </p>
        </ContentCard>
      </div>
    </ContentPage>
  );
}
