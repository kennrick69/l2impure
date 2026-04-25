import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  try {
    const data = await bridge.gm.listCharacters(params);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
