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

  // Railway/Vercel: req.url reflete o host interno (localhost:8080),
  // não o público. Forwarded headers ou NEXT_PUBLIC_SITE_URL são as
  // fontes corretas. Preferência: header forwarded → env var → req.url.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const siteUrl =
    forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : (process.env.NEXT_PUBLIC_SITE_URL?.replace(/^["'](.+)["']$/, "$1") ??
        url.origin);

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/verify?error=missing`);
  }
  const result = await consumeVerificationToken(token, "verification");
  if (!result) {
    return NextResponse.redirect(`${siteUrl}/verify?error=invalid`);
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
  return NextResponse.redirect(`${siteUrl}/login?verified=1`);
}
