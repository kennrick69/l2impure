import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function WalletPage() {
  return (
    <>
      <PageTitle
        title="Saldo"
        subtitle="Recargas, transferências para o jogo e histórico de transações."
      />
      <Placeholder
        icon="💰"
        title="Carteira em construção"
        description="Recargas, PIX e transferência pra conta do jogo serão liberados na próxima fase."
      />
    </>
  );
}
