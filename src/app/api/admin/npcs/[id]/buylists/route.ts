import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const npcId = Number(id);
  if (!Number.isFinite(npcId) || npcId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  try {
    const data = await bridge.gm.getNpcBuylists(npcId);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
