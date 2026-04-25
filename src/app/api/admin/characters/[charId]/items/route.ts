import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import { requireAdminAndGmUnlock, bridgeErrorResponse } from "@/lib/admin-gm-helpers";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

/**
 * POST /api/admin/characters/:charId/items
 * Body: { action: "add" | "modify" | "remove", ...args }
 *
 * - add { itemId, count, enchantLevel? }
 * - modify { objectId, count?, enchantLevel? }
 * - remove { objectId }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ charId: string }> },
) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;

  const { charId: raw } = await params;
  const charId = Number(raw);
  if (!Number.isFinite(charId) || charId <= 0) {
    return NextResponse.json({ error: "charId inválido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  const ip = clientIp(req);

  try {
    switch (action) {
      case "add": {
        const itemId = Number(body.itemId);
        const count = Number(body.count);
        const enchantLevel = Number(body.enchantLevel ?? 0);
        if (
          !Number.isFinite(itemId) ||
          itemId <= 0 ||
          !Number.isFinite(count) ||
          count <= 0
        ) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        const result = await bridge.gm.addInventoryItem(
          charId,
          itemId,
          count,
          Number.isFinite(enchantLevel) ? enchantLevel : 0,
        );
        await audit({
          userId: admin.userId,
          action: "admin_inv_add",
          ipAddress: ip,
          details: { charId, itemId, count, enchantLevel },
        });
        return NextResponse.json(result);
      }
      case "modify": {
        const objectId = Number(body.objectId);
        const patch: { count?: number; enchantLevel?: number } = {};
        if (body.count !== undefined) {
          const c = Number(body.count);
          if (!Number.isFinite(c) || c < 0)
            return NextResponse.json({ error: "count inválido" }, { status: 400 });
          patch.count = c;
        }
        if (body.enchantLevel !== undefined) {
          const e = Number(body.enchantLevel);
          if (!Number.isFinite(e) || e < 0 || e > 40)
            return NextResponse.json(
              { error: "enchantLevel inválido (0-40)" },
              { status: 400 },
            );
          patch.enchantLevel = e;
        }
        if (!Number.isFinite(objectId) || Object.keys(patch).length === 0) {
          return NextResponse.json({ error: "params inválidos" }, { status: 400 });
        }
        const result = await bridge.gm.modifyInventoryItem(charId, objectId, patch);
        await audit({
          userId: admin.userId,
          action: "admin_inv_modify",
          ipAddress: ip,
          details: { charId, objectId, ...patch },
        });
        return NextResponse.json(result);
      }
      case "remove": {
        const objectId = Number(body.objectId);
        if (!Number.isFinite(objectId) || objectId <= 0) {
          return NextResponse.json({ error: "objectId inválido" }, { status: 400 });
        }
        const result = await bridge.gm.removeInventoryItem(charId, objectId);
        await audit({
          userId: admin.userId,
          action: "admin_inv_remove",
          ipAddress: ip,
          details: { charId, objectId },
        });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
