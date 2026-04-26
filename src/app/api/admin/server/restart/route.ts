import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { bridge, BridgeError } from "@/lib/bridge";
import { clearNpcEditsPending } from "@/lib/npc-pending";

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

  try {
    await bridge.restartGameServer();
  } catch (e) {
    if (e instanceof BridgeError) {
      return NextResponse.json(
        { error: `Bridge falhou (${e.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Erro de rede com a bridge" },
      { status: 502 },
    );
  }

  // Restart aplicou XML/HTM edits pendentes — limpa flag
  clearNpcEditsPending().catch((e) => {
    console.warn(
      "[restart] clearNpcEditsPending falhou:",
      (e as Error).message,
    );
  });

  await audit({
    userId: admin.userId,
    action: "admin_restart_game_server",
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
