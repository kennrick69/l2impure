import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/wallet-history — WalletTransactions paginadas + filtros.
 * Filtros: from/to (ISO date), status, user (id numérico OU trecho de
 * email), minAmount/maxAmount (R$). Painel /admin/wallet/history.
 */

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
] as const;

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  user: z.string().max(255).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function parseDate(s: string | undefined, endOfDay: boolean): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  // Data pura (YYYY-MM-DD) no filtro "até" deve incluir o dia inteiro
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

  const rl = await rateLimit("admin_wallet_history", String(admin.userId), 60, 60);
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

  const where: Prisma.WalletTransactionWhereInput = {};
  const from = parseDate(q.from, false);
  const to = parseDate(q.to, true);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (q.status) where.status = q.status;
  if (q.user) {
    const asId = Number(q.user);
    if (Number.isInteger(asId) && asId > 0 && /^\d+$/.test(q.user)) {
      where.userId = asId;
    } else {
      where.user = { email: { contains: q.user, mode: "insensitive" } };
    }
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    where.amount = {
      ...(q.minAmount !== undefined ? { gte: q.minAmount } : {}),
      ...(q.maxAmount !== undefined ? { lte: q.maxAmount } : {}),
    };
  }

  const [total, txs] = await Promise.all([
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { user: { select: { id: true, email: true, coins: true } } },
    }),
  ]);

  return NextResponse.json({
    transactions: txs.map((t) => ({
      id: t.id,
      userId: t.userId,
      userEmail: t.user.email,
      userCoins: t.user.coins,
      amount: Number(t.amount),
      coins: t.coins,
      status: t.status,
      type: t.type,
      description: t.description,
      mpPaymentId: t.mpPaymentId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    total,
    limit: q.limit,
    offset: q.offset,
  });
}
