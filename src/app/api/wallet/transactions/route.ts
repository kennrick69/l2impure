import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";

export async function GET(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        coins: true,
        status: true,
        type: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.walletTransaction.count({ where: { userId: session.sub } }),
  ]);

  return NextResponse.json({
    transactions: items.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      coins: t.coins,
      status: t.status,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}
