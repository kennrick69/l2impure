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
    const data = await bridge.gm.getNpcSpawns(npcId);
    return NextResponse.json(data);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

/**
 * POST /api/admin/npcs/:id/spawns
 * Dispatcher: action = "add" | "move" | "remove"
 */
export async function POST(
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
  const action = body.action;
  const ip = clientIp(req);

  try {
    if (action === "add") {
      const x = Number(body.x);
      const y = Number(body.y);
      const z = Number(body.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return NextResponse.json({ error: "coords inválidas" }, { status: 400 });
      }
      await bridge.gm.addNpcSpawn(npcId, {
        x,
        y,
        z,
        heading: Number(body.heading ?? 0),
        respawnDelay: Number(body.respawnDelay ?? 60),
        respawnRand: Number(body.respawnRand ?? 0),
        periodOfDay: Number(body.periodOfDay ?? 0),
      });
      await markNpcEditsPending();
      await audit({
        userId: admin.userId,
        action: "admin_npc_spawn_add",
        ipAddress: ip,
        details: { npcId, x, y, z },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "move") {
      const required = ["x", "y", "z", "newX", "newY", "newZ"] as const;
      const vals: Record<string, number> = {};
      for (const k of required) {
        const n = Number(body[k]);
        if (!Number.isFinite(n))
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        vals[k] = n;
      }
      await bridge.gm.moveNpcSpawn({
        npcId,
        x: vals.x as number,
        y: vals.y as number,
        z: vals.z as number,
        newX: vals.newX as number,
        newY: vals.newY as number,
        newZ: vals.newZ as number,
        heading:
          body.heading !== undefined ? Number(body.heading) : undefined,
        respawnDelay:
          body.respawnDelay !== undefined ? Number(body.respawnDelay) : undefined,
      });
      await markNpcEditsPending();
      await audit({
        userId: admin.userId,
        action: "admin_npc_spawn_move",
        ipAddress: ip,
        details: { npcId, ...vals },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "remove") {
      const x = Number(body.x);
      const y = Number(body.y);
      const z = Number(body.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return NextResponse.json({ error: "coords inválidas" }, { status: 400 });
      }
      await bridge.gm.deleteNpcSpawn({ npcId, x, y, z });
      await markNpcEditsPending();
      await audit({
        userId: admin.userId,
        action: "admin_npc_spawn_remove",
        ipAddress: ip,
        details: { npcId, x, y, z },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
