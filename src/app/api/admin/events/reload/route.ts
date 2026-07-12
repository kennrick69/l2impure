import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridge, BridgeError } from "@/lib/bridge";

/**
 * POST /api/admin/events/reload — reinicia o gameserver via bridge
 * (systemctl restart l2j-game) pra carregar as configs aplicadas.
 * Jogadores online caem por ~30-60s — o painel confirma antes.
 */
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

  // Restart é operação pesada — rate limit apertado
  const rl = await rateLimit("admin_events_reload", clientIp(req), 3, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Aguarde alguns minutos entre restarts" },
      { status: 429 },
    );
  }

  let result;
  try {
    result = await bridge.config.reloadEvents(admin.email);
  } catch (e) {
    const message =
      e instanceof BridgeError ? e.message : "Falha inesperada na bridge";
    return NextResponse.json(
      { error: `Restart falhou: ${message}` },
      { status: e instanceof BridgeError ? 502 : 500 },
    );
  }

  await audit({
    userId: admin.userId,
    action: "admin_reload_gameserver",
    ipAddress: clientIp(req),
    details: { restartMethod: result.restart_method },
  });

  return NextResponse.json({ ok: true, restartMethod: result.restart_method });
}
