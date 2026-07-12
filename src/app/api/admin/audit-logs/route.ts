import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/audit-logs — AuditLog paginado + filtros.
 * Filtros: from/to (data), action, userId, contains (busca textual no
 * JSON `details`). Painel /admin/audit-logs.
 *
 * `contains` usa um pré-filtro raw (details::text ILIKE) limitado aos
 * 2000 matches mais recentes — Prisma não filtra Json root por
 * substring no Postgres. Índices já existentes cobrem o resto
 * (@@index action, createdAt, userId no schema — sem migration nova).
 */

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  action: z.string().max(50).optional(),
  userId: z.coerce.number().int().positive().optional(),
  contains: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function parseDate(s: string | undefined, endOfDay: boolean): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_audit_logs", String(admin.userId), 60, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
  }
  const q = parsed.data;

  const where: Prisma.AuditLogWhereInput = {};
  const from = parseDate(q.from, false);
  const to = parseDate(q.to, true);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (q.action) where.action = q.action;
  if (q.userId) where.userId = q.userId;

  if (q.contains) {
    const needle = `%${q.contains}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM audit_log
      WHERE details IS NOT NULL AND details::text ILIKE ${needle}
      ORDER BY created_at DESC
      LIMIT 2000
    `;
    where.id = { in: idRows.map((r) => r.id) };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      userEmail: l.user?.email ?? null,
      ipAddress: l.ipAddress,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    limit: q.limit,
    offset: q.offset,
    // sinaliza que o total considera só a janela do pré-filtro
    containsWindowCapped: q.contains ? true : undefined,
  });
}
