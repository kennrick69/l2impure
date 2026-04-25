import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function SupportPage() {
  return (
    <>
      <PageTitle
        title="Suporte"
        subtitle="Tire dúvidas, abra tickets e fale com a equipe."
      />
      <Placeholder
        icon="📞"
        title="Sistema de tickets em construção"
        description="Por enquanto, fale com a gente direto pelo Discord da L2 Impure."
      />
    </>
  );
}
