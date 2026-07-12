import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { isGmUnlocked } from "@/lib/gm-pin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { performWalletRefund } from "@/lib/wallet-refund";

/**
 * POST /api/admin/wallet-history/[txId]/refund
 *
 * Refund MP + débito de coins, idempotente (2º disparo → already-refunded,
 * sem débito dobrado). Exige sessão GM desbloqueada por PIN — mexe em
 * dinheiro real. Lógica em src/lib/wallet-refund.ts.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ txId: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  if (!(await isGmUnlocked(admin.userId))) {
    return NextResponse.json(
      {
        error: "Sessão GM expirada. Insira o PIN novamente.",
        code: "pin_required",
      },
      { status: 403 },
    );
  }

  const rl = await rateLimit("admin_wallet_refund", String(admin.userId), 10, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { txId: rawId } = await params;
  const txId = Number(rawId);
  if (!Number.isFinite(txId) || txId <= 0) {
    return NextResponse.json({ error: "txId inválido" }, { status: 400 });
  }

  const result = await performWalletRefund({
    txId,
    adminUserId: admin.userId,
    ipAddress: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.alreadyRefunded) {
    return NextResponse.json({ ok: true, code: "already-refunded" });
  }
  return NextResponse.json({
    ok: true,
    coinsDebited: result.coinsDebited,
    coinsExpected: result.coinsExpected,
    partial: result.partial,
  });
}
