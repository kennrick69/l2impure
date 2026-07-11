import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridgeFetch, BridgeError } from "@/lib/bridge";
import type { GmCommandDto } from "@/lib/gm-commands";

/**
 * GET /api/admin/gm-commands/[id] — status de um comando da fila.
 * Usado pelo <GmCommandTrigger /> pra pollar pending → running → done.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const rl = await rateLimit("admin_gm_commands_get", clientIp(req), 240, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { id } = await params;
  const commandId = Number(id);
  if (!Number.isFinite(commandId) || commandId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const data = await bridgeFetch<{ command: GmCommandDto }>(
      "GET",
      `/gm-commands/${commandId}`,
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof BridgeError && e.status === 404) {
      return NextResponse.json({ error: "Comando não encontrado" }, { status: 404 });
    }
    console.error("[/api/admin/gm-commands/[id]]", e);
    return NextResponse.json(
      { error: "Erro de rede com a bridge" },
      { status: 502 },
    );
  }
}
