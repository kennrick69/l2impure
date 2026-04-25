import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  code: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/),
  coins: z.number().int().min(0).max(100000),
  maxUses: z.number().int().positive().max(1_000_000).nullable(),
  expiresAt: z.string().nullable(),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  try {
    const created = await prisma.promoCode.create({
      data: {
        code: body.code,
        reward: { coins: body.coins },
        maxUses: body.maxUses,
        expiresAt,
      },
      select: { id: true, code: true },
    });
    await audit({
      userId: admin.userId,
      action: "admin_create_promo_code",
      ipAddress: clientIp(req),
      details: { code: created.code, coins: body.coins },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Já existe um código com esse nome" },
        { status: 409 },
      );
    }
    console.error("[admin promo-codes POST]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
