import { prisma } from "@/lib/db";
import { UserActions } from "@/components/admin/UserActions";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      isVerified: true,
      role: true,
      bannedAt: true,
      createdAt: true,
      _count: { select: { gameAccounts: true } },
    },
    take: 200,
  });

  // Last login = max(audit_log.created_at) WHERE action='login'
  const lastLogins = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: { action: "login", userId: { in: users.map((u) => u.id) } },
    _max: { createdAt: true },
  });
  const lastLoginByUser = new Map(
    lastLogins.map((r) => [r.userId, r._max.createdAt]),
  );

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Usuários
      </h1>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-[color:var(--l2-bg-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Cadastro</th>
                <th className="px-6 py-3 text-left">Verif.</th>
                <th className="px-6 py-3 text-left">Contas</th>
                <th className="px-6 py-3 text-left">Último login</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const lastLogin = lastLoginByUser.get(u.id) ?? null;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-6 py-3 text-white/85">
                      {u.email}
                      {u.role === "admin" && (
                        <span className="ml-2 rounded-full bg-l2-red/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-l2-red">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {u.isVerified ? (
                        <span className="text-l2-green">Sim</span>
                      ) : (
                        <span className="text-white/45">Não</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs tabular-nums text-white/75">
                      {u._count.gameAccounts}
                    </td>
                    <td className="px-6 py-3 text-xs text-white/55">
                      {lastLogin
                        ? new Date(lastLogin).toLocaleString("pt-BR")
                        : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {u.bannedAt ? (
                        <span className="text-l2-red">Banido</span>
                      ) : (
                        <span className="text-l2-green">Ativo</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <UserActions
                        userId={u.id}
                        email={u.email}
                        banned={u.bannedAt !== null}
                        isAdmin={u.role === "admin"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
