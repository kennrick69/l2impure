import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import {
  requireAdminApi,
  requireAdminAndGmUnlock,
  bridgeErrorResponse,
} from "@/lib/admin-gm-helpers";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { markNpcEditsPending } from "@/lib/npc-pending";

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  }
  try {
    const data = await bridge.gm.readNpcDialogue(filePath);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  if (typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content obrigatório (string)" },
      { status: 400 },
    );
  }
  try {
    const result = await bridge.gm.writeNpcDialogue(filePath, body.content);
    await markNpcEditsPending();
    await audit({
      userId: admin.userId,
      action: "admin_npc_dialogue_write",
      ipAddress: clientIp(req),
      details: { path: filePath, size: body.content.length },
    });
    return NextResponse.json(result);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
