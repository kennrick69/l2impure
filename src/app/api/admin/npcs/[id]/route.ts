import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import {
  requireAdminAndGmUnlock,
  bridgeErrorResponse,
} from "@/lib/admin-gm-helpers";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { markNpcEditsPending } from "@/lib/npc-pending";

/** PATCH /api/admin/npcs/:id { name, title } — rename */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;
  const { id } = await params;
  const npcId = Number(id);
  if (!Number.isFinite(npcId) || npcId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "");
  const title = String(body.title ?? "");
  if (name.length === 0 || name.length > 75 || title.length > 75) {
    return NextResponse.json({ error: "nome/título inválidos" }, { status: 400 });
  }
  try {
    const result = await bridge.gm.renameNpc(npcId, name, title);
    await markNpcEditsPending();
    await audit({
      userId: admin.userId,
      action: "admin_npc_rename",
      ipAddress: clientIp(req),
      details: { npcId, name, title, file: result.file },
    });
    return NextResponse.json(result);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
