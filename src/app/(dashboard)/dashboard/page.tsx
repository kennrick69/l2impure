import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <div className="min-h-screen bg-[color:var(--l2-bg-primary)] p-8">
      <div className="l2-container-wide">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="L2 Impure"
              className="h-12 w-auto"
            />
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="font-display text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
            >
              Sair
            </button>
          </form>
        </header>

        <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-wide text-white">
          Dashboard
        </h1>
        <p className="text-sm text-white/55">
          Logado como{" "}
          <span className="text-[color:var(--l2-text-gold)]">
            {session.email}
          </span>
        </p>

        <div className="mt-10 rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)] p-8">
          <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wider text-white">
            Em construção
          </h2>
          <p className="text-sm text-white/65">
            As próximas fases vão trazer: criar conta de jogo, listar
            personagens, ver rankings, transferir saldo, reset HWID e o sistema
            de Híbridos.
          </p>
        </div>
      </div>
    </div>
  );
}
