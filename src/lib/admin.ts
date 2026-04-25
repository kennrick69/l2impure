import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSession } from "./auth";

export type AdminSession = {
  userId: number;
  email: string;
};

/**
 * Garante que a request veio de um admin. Em Server Components,
 * redireciona pra /login se sem sessão e pra / se sem role admin.
 * Em API routes, throws AdminError com status 401/403.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new AdminError("Não autenticado", 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, bannedAt: true, email: true },
  });
  if (!user || user.bannedAt) {
    throw new AdminError("Acesso negado", 403);
  }
  if (user.role !== "admin") {
    throw new AdminError("Apenas administradores", 403);
  }
  return { userId: session.sub, email: user.email };
}

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/**
 * Versão pra Server Components que redireciona em vez de throw.
 */
export async function requireAdminOrRedirect(): Promise<AdminSession> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError && e.status === 401) {
      redirect("/login?redirect=/admin/dashboard");
    }
    if (e instanceof AdminError && e.status === 403) {
      redirect("/dashboard");
    }
    throw e;
  }
}
