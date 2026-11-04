import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CreateAccountModalProvider } from "@/components/dashboard/CreateAccountModal";
import { ToastProvider } from "@/components/ui/Toast";
import { getServerStatus } from "@/lib/server-status";
import { checkAndConvertReferral } from "@/lib/referral-conversion";

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

  // Status do servidor de jogo — fail soft: se a bridge cair, sidebar
  // mostra "Indisponível" em vez de quebrar o layout. getServerStatus()
  // tem cache Redis 30s + snapshot stale 24h + override admin do
  // player count (lógica centralizada em src/lib/server-status.ts).
  const serverStatus = await getServerStatus();

  // Role (atalho admin no dropdown) + saldo de TOL (card de saldo na header).
  let isAdmin = false;
  let balance = 0;
  try {
    const u = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, coins: true },
    });
    isAdmin = u?.role === "admin";
    balance = u?.coins ?? 0;
  } catch {
    /* fail-soft */
  }

  // Se o usuário foi indicado e a indicação está pendente, tenta
  // convergir aqui (o trigger é "indicado loga no dashboard"). Não
  // bloqueia o layout — failure é silenciosa.
  try {
    const ownReferral = await prisma.referral.findUnique({
      where: { referredId: session.sub },
      select: { id: true, status: true },
    });
    if (ownReferral && ownReferral.status === "pending") {
      await checkAndConvertReferral(ownReferral.id);
    }
  } catch (e) {
    console.warn(
      "[dashboard layout] referral check falhou:",
      (e as Error).message,
    );
  }

  return (
    <ToastProvider>
      <CreateAccountModalProvider>
        <div className="l2-atmosphere relative flex min-h-screen flex-col">
          <div className="l2-grain" aria-hidden="true" />
          <DashboardHeader
            email={session.email}
            isAdmin={isAdmin}
            balance={balance}
          />
          <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
            <Sidebar serverStatus={serverStatus} />
            <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
              <div className="mx-auto w-full max-w-[1100px]">{children}</div>
            </main>
          </div>
        </div>
      </CreateAccountModalProvider>
    </ToastProvider>
  );
}
