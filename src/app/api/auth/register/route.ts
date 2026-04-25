import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  createVerificationToken,
} from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  recaptchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  const rl = await rateLimit(
    "register",
    ip,
    rateLimits.register.max,
    rateLimits.register.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 1 hora." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const captcha = await verifyRecaptcha(body.recaptchaToken, "register");
  if (!captcha.success) {
    return NextResponse.json(
      { error: "Falha na verificação anti-bot" },
      { status: 400 },
    );
  }

  // Decisão de produto: servidor de jogo, não fintech — UX > anti-enumeração.
  // - Verificado: 409 com mensagem clara (manda pro login)
  // - Não verificado: gera novo token e reenvia email (mesmo fluxo de
  //   "Quase lá" pro usuário — efeito = "resend automático")
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, email: true, isVerified: true },
  });
  if (existing) {
    if (existing.isVerified) {
      await audit({
        userId: existing.id,
        action: "register_duplicate",
        ipAddress: ip,
        details: { email: body.email, verified: true },
      });
      return NextResponse.json(
        {
          error: "Este email já está cadastrado. Faça login ou recupere sua senha.",
          code: "already_registered",
        },
        { status: 409 },
      );
    }

    // Não verificado → reenvia automático. Rate limit do IP (10/h)
    // já protege contra abuso de resend.
    const { token } = await createVerificationToken(
      existing.id,
      "verification",
      24 * 60,
    );
    try {
      await sendVerificationEmail(existing.email, token);
    } catch (e) {
      console.error("[register] resend sendVerificationEmail failed:", e);
    }
    await audit({
      userId: existing.id,
      action: "register_duplicate",
      ipAddress: ip,
      details: { email: body.email, verified: false, action: "resent_verification" },
    });
    return NextResponse.json({ ok: true, resent: true }, { status: 201 });
  }

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: { email: body.email, passwordHash },
    select: { id: true, email: true },
  });

  const { token } = await createVerificationToken(
    user.id,
    "verification",
    24 * 60,
  );

  try {
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error("[register] sendVerificationEmail failed:", e);
    // Continua sem falhar — usuário pode pedir reenvio.
  }

  await audit({
    userId: user.id,
    action: "register",
    ipAddress: ip,
    details: { email: user.email },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
