import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Proteção de rotas autenticadas.
 * Executa em Node runtime (server component), então `jsonwebtoken`,
 * `bcryptjs`, `node:crypto` e Prisma funcionam normalmente.
 *
 * Isso substitui o middleware edge — evita o bug do Next.js 16 +
 * Turbopack de incluir `node:crypto` no bundle edge mesmo sem import
 * direto.
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
  return <>{children}</>;
}
