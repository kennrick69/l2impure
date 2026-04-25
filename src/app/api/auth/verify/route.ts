import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeVerificationToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1).max(512),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const result = await consumeVerificationToken(body.token, "verification");
  if (!result) {
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { isVerified: true },
  });

  await audit({
    userId: result.userId,
    action: "verify_email",
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true });
}

/** Suporte a GET pra permitir click-only via email link */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify?error=missing", req.url));
  }
  const result = await consumeVerificationToken(token, "verification");
  if (!result) {
    return NextResponse.redirect(new URL("/verify?error=invalid", req.url));
  }
  await prisma.user.update({
    where: { id: result.userId },
    data: { isVerified: true },
  });
  await audit({
    userId: result.userId,
    action: "verify_email",
    ipAddress: clientIp(req),
  });
  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
