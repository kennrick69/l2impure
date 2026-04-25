import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { bridge, BridgeError } from "@/lib/bridge";

const loginSchema = z
  .string()
  .min(5)
  .max(45)
  .regex(/^[A-Za-z0-9]+$/);

const bodySchema = z.object({
  password: z.string().min(6).max(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ login: string }> },
) {
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
  const { login: rawLogin } = await params;
  const parsedLogin = loginSchema.safeParse(rawLogin);
  if (!parsedLogin.success) {
    return NextResponse.json({ error: "Login inválido" }, { status: 400 });
  }
  const login = parsedLogin.data;

  const account = await prisma.gameAccount.findUnique({
    where: { gameLogin: login },
    select: { userId: true },
  });
  if (!account || account.userId !== session.sub) {
    return NextResponse.json(
      { error: "Conta não encontrada" },
      { status: 404 },
    );
  }

  const rl = await rateLimit(
    "default",
    `chgame:${session.sub}`,
    rateLimits.default.max,
    rateLimits.default.window,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns segundos." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Senha precisa ter entre 6 e 32 caracteres" },
      { status: 400 },
    );
  }

  try {
    await bridge.changeGamePassword(login, body.password);
  } catch (e) {
    if (e instanceof BridgeError && e.status === 404) {
      return NextResponse.json(
        { error: "Conta não encontrada no servidor de jogo" },
        { status: 404 },
      );
    }
    console.error("[/api/game/accounts/change-password] bridge falhou:", e);
    return NextResponse.json(
      {
        error: "Não foi possível trocar a senha agora. Tente em instantes.",
      },
      { status: 502 },
    );
  }

  await audit({
    userId: session.sub,
    action: "change_game_password",
    ipAddress: ip,
    details: { gameLogin: login },
  });

  return NextResponse.json({ ok: true });
}
