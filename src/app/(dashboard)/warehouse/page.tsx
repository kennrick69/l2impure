import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function WarehousePage() {
  return (
    <>
      <PageTitle
        title="Meu depósito"
        subtitle="Itens armazenados que você pode transferir pra suas contas no jogo."
      />
      <Placeholder
        icon="📦"
        title="Depósito vazio"
        description="Sistema de depósito ainda não está disponível. Vai liberar junto com a bridge VPS (Fase 3)."
      />
    </>
  );
}
