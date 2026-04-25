import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Apenas letras, números, _ e -"),
});

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const ip = clientIp(req);
  const rl = await rateLimit(
    "default",
    `promo:${session.sub}`,
    rateLimits.default.max,
    rateLimits.default.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns segundos." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }
  const code = body.code.toUpperCase();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code } });
      if (!promo) {
        return { kind: "not_found" as const };
      }
      if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
        return { kind: "expired" as const };
      }
      if (promo.maxUses !== null && promo.uses >= promo.maxUses) {
        return { kind: "exhausted" as const };
      }

      try {
        await tx.promoRedemption.create({
          data: { userId: session.sub, promoCodeId: promo.id },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          return { kind: "already_redeemed" as const };
        }
        throw e;
      }

      await tx.promoCode.update({
        where: { id: promo.id },
        data: { uses: { increment: 1 } },
      });

      return { kind: "ok" as const, reward: promo.reward, code: promo.code };
    });

    switch (result.kind) {
      case "not_found":
        return NextResponse.json(
          { error: "Código inválido ou inexistente" },
          { status: 404 },
        );
      case "expired":
        return NextResponse.json(
          { error: "Esse código expirou" },
          { status: 410 },
        );
      case "exhausted":
        return NextResponse.json(
          { error: "Esse código já atingiu o limite de usos" },
          { status: 410 },
        );
      case "already_redeemed":
        return NextResponse.json(
          { error: "Você já resgatou esse código" },
          { status: 409 },
        );
      case "ok":
        await audit({
          userId: session.sub,
          action: "redeem_promo_code",
          ipAddress: ip,
          details: { code: result.code },
        });
        return NextResponse.json({
          ok: true,
          code: result.code,
          reward: result.reward,
          note: "Resgate registrado. A entrega da recompensa entra na próxima fase de integração com o servidor.",
        });
    }
  } catch (e) {
    console.error("[/api/promo-codes/redeem] erro:", e);
    return NextResponse.json(
      { error: "Erro interno. Tente de novo em instantes." },
      { status: 500 },
    );
  }
}
