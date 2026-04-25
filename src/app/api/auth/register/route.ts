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

  // Email duplicado responde 409 com mensagem clara (priorizamos UX
  // sobre anti-enumeração — decisão de produto: servidor de jogo, não
  // fintech, o ganho de UX vale mais que a proteção).
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, isVerified: true },
  });
  if (existing) {
    await audit({
      userId: existing.id,
      action: "register_duplicate",
      ipAddress: ip,
      details: { email: body.email },
    });
    return NextResponse.json(
      {
        error: existing.isVerified
          ? "Este email já está cadastrado. Faça login ou recupere sua senha."
          : "Este email já está cadastrado mas ainda não foi verificado. Cheque seu inbox ou peça novo link.",
        code: existing.isVerified ? "already_registered" : "already_registered_unverified",
      },
      { status: 409 },
    );
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
