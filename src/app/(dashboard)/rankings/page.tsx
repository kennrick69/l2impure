import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function RankingsPage() {
  return (
    <>
      <PageTitle
        title="Classificação"
        subtitle="TOP-5 Clãs, PvP e PK do servidor."
      />
      <Placeholder
        icon="🏆"
        title="Rankings em construção"
        description="Os rankings ao vivo vão aparecer aqui quando a bridge VPS estiver pronta (Fase 3)."
      />
    </>
  );
}
