import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function CharactersPage() {
  return (
    <>
      <PageTitle
        title="Meus personagens"
        subtitle="Lista de personagens das suas contas de jogo."
      />
      <Placeholder
        icon="⚔️"
        title="Sem personagens ainda"
        description="A lista de personagens vai aparecer aqui assim que a bridge VPS estiver pronta (Fase 3)."
      />
    </>
  );
}
