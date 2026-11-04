import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, AuthError } from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { mp, MercadoPagoError } from "@/lib/mercadopago";

const MIN_AMOUNT_BRL = 5;
const MAX_AMOUNT_BRL = 5000;
const COIN_RATE = 1.5; // 1 TOL = R$1,50

// Bônus é aplicado NA COMPRA (TOL extra cai no painel), não no envio ao jogo.
const BONUS_TIERS = [
  { from: 300, bonus: 40 },
  { from: 200, bonus: 30 },
  { from: 150, bonus: 25 },
  { from: 100, bonus: 20 },
  { from: 50, bonus: 15 },
] as const;

/** % de bônus na compra de `tol` TOL (base, antes do bônus). */
function bonusFor(tol: number): number {
  for (const t of BONUS_TIERS) if (tol >= t.from) return t.bonus;
  return 0;
}

const schema = z.object({
  amount: z.coerce.number().min(MIN_AMOUNT_BRL).max(MAX_AMOUNT_BRL),
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

  if (!(await mp.isConfigured())) {
    return NextResponse.json(
      { error: "Mercado Pago não está configurado nesse ambiente" },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const rl = await rateLimit(
    "default",
    `walletPref:${session.sub}`,
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
    return NextResponse.json(
      { error: `Valor inválido (mínimo R$${MIN_AMOUNT_BRL})` },
      { status: 400 },
    );
  }

  const amount = Math.round(body.amount * 100) / 100;
  const baseCoins = Math.floor(amount / COIN_RATE);
  if (baseCoins <= 0) {
    return NextResponse.json({ error: "Valor muito baixo" }, { status: 400 });
  }
  // Bônus na compra: o painel recebe base + bônus do tier.
  const bonusPct = bonusFor(baseCoins);
  const coins = Math.floor(baseCoins * (1 + bonusPct / 100));

  // Cria a transação primeiro pra ter o ID, depois usa em external_reference.
  const tx = await prisma.walletTransaction.create({
    data: {
      userId: session.sub,
      amount,
      coins,
      status: "pending",
      type: "recharge",
      description:
        bonusPct > 0
          ? `Recarga de ${baseCoins} TOL (+${bonusPct}% = ${coins})`
          : `Recarga de ${coins} TOL`,
    },
  });

  const externalReference = `wallet-${session.sub}-${tx.id}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^["'](.+)["']$/, "$1") ||
    "https://l2impure.com";

  let preference;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { email: true },
    });
    preference = await mp.createCheckoutPreference({
      title: `L2 Impure - Recarga de ${coins} coins`,
      description: `Recarga de ${coins} coins na carteira do painel`,
      unitPrice: amount,
      payerEmail: user?.email,
      externalReference,
      backUrls: {
        success: `${siteUrl}/wallet?status=success`,
        failure: `${siteUrl}/wallet?status=failure`,
        pending: `${siteUrl}/wallet?status=pending`,
      },
    });
  } catch (e) {
    // Bridge MP falhou — marca tx como rejected pra não ficar pendente eterno
    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: { status: "rejected", description: `MP error: ${(e as Error).message}` },
    });
    if (e instanceof MercadoPagoError) {
      return NextResponse.json(
        { error: `Mercado Pago: ${e.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Erro de rede com Mercado Pago" },
      { status: 502 },
    );
  }

  await prisma.walletTransaction.update({
    where: { id: tx.id },
    data: { mpPreferenceId: preference.preferenceId },
  });

  await audit({
    userId: session.sub,
    action: "wallet_create_preference",
    ipAddress: ip,
    details: { amount, coins, transactionId: tx.id, preferenceId: preference.preferenceId },
  });

  return NextResponse.json({
    transactionId: tx.id,
    preferenceId: preference.preferenceId,
    initPoint: preference.initPoint,
    coins,
    amount,
  });
}
