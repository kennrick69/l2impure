import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

/**
 * Proteção de rotas autenticadas + shell visual (sidebar + header).
 * Roda em Node runtime — substitui middleware edge (bug node:crypto).
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
    <div className="flex min-h-screen flex-col bg-[color:var(--l2-bg-primary)] lg:flex-row">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardHeader email={session.email} />
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-[1100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
