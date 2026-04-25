import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const itemId = Number(url.searchParams.get("itemId"));
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "itemId obrigatório" }, { status: 400 });
  }

  try {
    const data = await bridge.gm.findItemOwners(itemId, limit, offset);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
