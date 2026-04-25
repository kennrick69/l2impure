import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ charId: string }> },
) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const { charId: raw } = await params;
  const charId = Number(raw);
  if (!Number.isFinite(charId) || charId <= 0) {
    return NextResponse.json({ error: "charId inválido" }, { status: 400 });
  }
  try {
    const data = await bridge.gm.getCharacterFull(charId);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
