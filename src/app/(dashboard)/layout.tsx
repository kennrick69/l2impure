import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CreateAccountModalProvider } from "@/components/dashboard/CreateAccountModal";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Shell do painel: header full-width sticky topo, sidebar 280px à esquerda,
 * main scrollável à direita. Proteção via getSession() em Node runtime.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <ToastProvider>
      <CreateAccountModalProvider>
        <div className="flex min-h-screen flex-col bg-[color:var(--l2-bg-primary)]">
          <DashboardHeader email={session.email} />
          <div className="flex flex-1 flex-col lg:flex-row">
            <Sidebar />
            <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
              <div className="mx-auto w-full max-w-[1100px]">{children}</div>
            </main>
          </div>
        </div>
      </CreateAccountModalProvider>
    </ToastProvider>
  );
}
