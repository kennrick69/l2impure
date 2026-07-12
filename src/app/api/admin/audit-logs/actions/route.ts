import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/audit-logs/actions — actions distintas pro dropdown
 * de filtro. Client cacheia 5min (ver AuditLogsPanel).
 */
export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_audit_actions", String(admin.userId), 20, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const rows = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({ actions: rows.map((r) => r.action) });
}
