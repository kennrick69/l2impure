import { PageTitle, Placeholder } from "@/components/dashboard/Placeholder";

export default function SettingsPage() {
  return (
    <>
      <PageTitle
        title="Configurações"
        subtitle="Email, senha, idioma e preferências da conta."
      />
      <Placeholder
        icon="⚙️"
        title="Configurações em construção"
        description="Trocar senha, ativar 2FA e atualizar email vão aparecer aqui."
      />
    </>
  );
}
