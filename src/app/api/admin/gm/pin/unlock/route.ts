import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { verifyGmPin, unlockGmSession } from "@/lib/gm-pin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN deve ter 6 dígitos"),
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

  // 5 tentativas por 5 min por user (bloqueia bruteforce do PIN)
  const rl = await rateLimit("gmPinUnlock", String(admin.userId), 5, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 5 minutos." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "PIN inválido (precisa ter 6 dígitos)" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { gmPinHash: true },
  });
  if (!user || !user.gmPinHash) {
    return NextResponse.json(
      { error: "PIN não configurado. Configure antes de desbloquear." },
      { status: 400 },
    );
  }

  const ok = await verifyGmPin(body.pin, user.gmPinHash);
  if (!ok) {
    await audit({
      userId: admin.userId,
      action: "admin_gm_pin_fail",
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
  }

  await unlockGmSession(admin.userId);
  await audit({
    userId: admin.userId,
    action: "admin_gm_pin_unlock",
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
