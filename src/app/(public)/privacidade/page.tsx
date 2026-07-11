import type { Metadata } from "next";
import { ContentPage, ContentCard } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Política de Privacidade | L2 Impure",
  description:
    "Como o L2 Impure trata seus dados: o que coletamos, pra que usamos, com quem (não) compartilhamos e seus direitos sob a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <ContentPage
      eyebrow="🔐 LGPD"
      title="Política de Privacidade"
      intro="Última atualização: julho de 2026. Versão curta: coletamos o mínimo necessário pra sua conta funcionar, não vendemos dados a ninguém, e você pode pedir a exclusão quando quiser."
    >
      <div className="flex flex-col gap-5">
        <ContentCard title="1. O que coletamos">
          <p>
            <strong>Conta do site:</strong> email e senha (armazenada com
            hash bcrypt — nem a staff consegue ler).{" "}
            <strong>Conta de jogo:</strong> login e senha do jogo.{" "}
            <strong>Técnico:</strong> endereço IP e registros de acesso
            (auditoria de segurança e anti-fraude), e cookies estritamente
            funcionais de sessão (HttpOnly). Usamos o Google reCAPTCHA pra
            proteger formulários — sujeito à política de privacidade do
            Google.
          </p>
        </ContentCard>
        <ContentCard title="2. Pra que usamos">
          <p>
            Autenticação, recuperação de senha, avisos importantes do
            servidor (verificação de email, launch, segurança) e proteção
            contra bots e fraude. Não fazemos marketing de terceiros nem
            vendemos ou alugamos seus dados. Ponto.
          </p>
        </ContentCard>
        <ContentCard title="3. Pagamentos">
          <p>
            Doações são processadas por gateway de pagamento externo
            (Mercado Pago). Dados de cartão ou PIX ficam com o processador —
            o L2 Impure não armazena dados financeiros, apenas o registro da
            transação (valor, status, identificador).
          </p>
        </ContentCard>
        <ContentCard title="4. Retenção e segurança">
          <p>
            Dados de conta ficam armazenados enquanto a conta existir.
            Senhas com hash bcrypt, tráfego 100% HTTPS, cookies de sessão
            HttpOnly/Secure, e backups criptografados da infraestrutura.
          </p>
        </ContentCard>
        <ContentCard title="5. Seus direitos (LGPD)">
          <p>
            Nos termos da Lei 13.709/2018, você pode solicitar acesso,
            correção ou exclusão dos seus dados a qualquer momento pelo email{" "}
            <a href="mailto:admin@l2impure.com" className="underline text-l2-gold">
              admin@l2impure.com
            </a>
            . Exclusão de conta remove seus dados pessoais dos sistemas
            ativos em até 30 dias (personagens e itens do jogo são apagados
            junto).
          </p>
        </ContentCard>
        <ContentCard title="6. Mudanças nesta política">
          <p>
            Alterações relevantes serão anunciadas no Discord oficial e nesta
            página antes de entrarem em vigor.
          </p>
        </ContentCard>
      </div>
    </ContentPage>
  );
}
