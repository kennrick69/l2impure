import { prisma } from "@/lib/db";
import {
  AuditLogsPanel,
  type AuditLogRow,
} from "@/components/admin/AuditLogsPanel";

export const dynamic = "force-dynamic";

/**
 * /admin/audit-logs — audit trail completo (Postgres audit_log) com
 * filtros server-side. SSR entrega a primeira página; filtros e
 * paginação vão por /api/admin/audit-logs.
 */
export default async function AdminAuditLogsPage() {
  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  const logs: AuditLogRow[] = rows.map((l) => ({
    id: l.id,
    action: l.action,
    userId: l.userId,
    userEmail: l.user?.email ?? null,
    ipAddress: l.ipAddress,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold uppercase tracking-wide text-white">
        Audit logs
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Trilha de ações sensíveis do site (login, GM, wallet, secrets…).
        Filtre por período, action, user ou texto dentro do JSON de
        detalhes.
      </p>
      <AuditLogsPanel initial={{ logs, total, offset: 0 }} />
    </>
  );
}
