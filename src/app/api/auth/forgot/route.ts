import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createVerificationToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  recaptchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const rl = await rateLimit(
    "forgot",
    body.email,
    rateLimits.forgotPassword.max,
    rateLimits.forgotPassword.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações pra este email. Tente em 1 hora." },
      { status: 429 },
    );
  }

  const captcha = await verifyRecaptcha(body.recaptchaToken, "forgot");
  if (!captcha.success) {
    return NextResponse.json(
      { error: "Falha na verificação anti-bot" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, email: true },
  });

  // Sempre responde OK — anti-enumeração de emails.
  if (!user) {
    await audit({
      action: "forgot_password_unknown_email",
      ipAddress: ip,
      details: { email: body.email },
    });
    return NextResponse.json({ ok: true });
  }

  const { token } = await createVerificationToken(user.id, "reset", 60);
  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (e) {
    console.error("[forgot] send failed:", e);
  }

  await audit({
    userId: user.id,
    action: "forgot_password",
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true });
}
