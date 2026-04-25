import { PageTitle } from "@/components/dashboard/Placeholder";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";

export default function SettingsPage() {
  return (
    <>
      <PageTitle
        title="Configurações"
        subtitle="Gerencie senha, email e preferências da conta."
      />
      <ChangePasswordForm />
    </>
  );
}
