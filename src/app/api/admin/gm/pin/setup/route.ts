import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, AdminError } from "@/lib/admin";
import { hashGmPin, unlockGmSession } from "@/lib/gm-pin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN deve ter exatamente 6 dígitos"),
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

  // Setup só funciona se ainda não tem PIN. Reset deve usar fluxo
  // separado (não exposto agora — precisa de outro admin OU SQL direto).
  const user = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { gmPinHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User não existe" }, { status: 404 });
  }
  if (user.gmPinHash) {
    return NextResponse.json(
      { error: "PIN já configurado. Use desbloqueio." },
      { status: 409 },
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

  const hash = await hashGmPin(body.pin);
  await prisma.user.update({
    where: { id: admin.userId },
    data: { gmPinHash: hash },
  });
  await unlockGmSession(admin.userId);

  await audit({
    userId: admin.userId,
    action: "admin_gm_pin_setup",
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
