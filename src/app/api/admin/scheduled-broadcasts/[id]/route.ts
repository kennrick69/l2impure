import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bridgeFetch, BridgeError } from "@/lib/bridge";

/**
 * DELETE /api/admin/scheduled-broadcasts/[id] — cancela um broadcast
 * agendado (só se ainda pending). Cancelar é inofensivo: não exige PIN,
 * só sessão admin.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const rl = await rateLimit(
    "admin_scheduled_broadcasts_cancel",
    String(admin.userId),
    30,
    60,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const { id } = await params;
  const schedId = Number(id);
  if (!Number.isInteger(schedId) || schedId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await bridgeFetch("DELETE", `/scheduled-commands/${schedId}`);
  } catch (e) {
    if (e instanceof BridgeError && e.status === 409) {
      return NextResponse.json(
        { error: "Já disparado ou já cancelado — não dá mais pra cancelar" },
        { status: 409 },
      );
    }
    if (e instanceof BridgeError) {
      return NextResponse.json(
        { error: `Bridge falhou (${e.status})` },
        { status: 502 },
      );
    }
    console.error("[/api/admin/scheduled-broadcasts/:id]", e);
    return NextResponse.json(
      { error: "Erro de rede com a bridge" },
      { status: 502 },
    );
  }

  await audit({
    userId: admin.userId,
    action: "admin_scheduled_broadcast_cancel",
    ipAddress: clientIp(req),
    details: { scheduledId: schedId },
  });

  return NextResponse.json({ ok: true });
}
