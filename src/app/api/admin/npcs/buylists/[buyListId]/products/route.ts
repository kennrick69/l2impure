import { NextResponse } from "next/server";
import { bridge } from "@/lib/bridge";
import {
  requireAdminAndGmUnlock,
  bridgeErrorResponse,
} from "@/lib/admin-gm-helpers";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { markNpcEditsPending } from "@/lib/npc-pending";

/** POST { itemId, price } — adiciona product à buyList */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ buyListId: string }> },
) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;
  const { buyListId: raw } = await params;
  const buyListId = Number(raw);
  if (!Number.isFinite(buyListId) || buyListId <= 0) {
    return NextResponse.json({ error: "buyListId inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const itemId = Number(body.itemId);
  const price = Number(body.price);
  if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "itemId/price inválidos" }, { status: 400 });
  }
  try {
    const result = await bridge.gm.addBuylistProduct(buyListId, itemId, price);
    await markNpcEditsPending();
    await audit({
      userId: admin.userId,
      action: "admin_npc_buylist_add",
      ipAddress: clientIp(req),
      details: { buyListId, itemId, price },
    });
    return NextResponse.json(result);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

/** PATCH { itemId, price } — atualiza price de product existente */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ buyListId: string }> },
) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;
  const { buyListId: raw } = await params;
  const buyListId = Number(raw);
  if (!Number.isFinite(buyListId) || buyListId <= 0) {
    return NextResponse.json({ error: "buyListId inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const itemId = Number(body.itemId);
  const price = Number(body.price);
  if (
    !Number.isFinite(itemId) ||
    itemId <= 0 ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return NextResponse.json({ error: "itemId/price inválidos" }, { status: 400 });
  }
  try {
    const result = await bridge.gm.updateBuylistProductPrice(
      buyListId,
      itemId,
      price,
    );
    await markNpcEditsPending();
    await audit({
      userId: admin.userId,
      action: "admin_npc_buylist_price",
      ipAddress: clientIp(req),
      details: { buyListId, itemId, price },
    });
    return NextResponse.json(result);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

/** DELETE { itemId } — remove product */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ buyListId: string }> },
) {
  const guard = await requireAdminAndGmUnlock();
  if (guard.response) return guard.response;
  const admin = guard.admin;
  const { buyListId: raw } = await params;
  const buyListId = Number(raw);
  if (!Number.isFinite(buyListId) || buyListId <= 0) {
    return NextResponse.json({ error: "buyListId inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { itemId?: number };
  const itemId = Number(body.itemId);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "itemId inválido" }, { status: 400 });
  }
  try {
    const result = await bridge.gm.removeBuylistProduct(buyListId, itemId);
    await markNpcEditsPending();
    await audit({
      userId: admin.userId,
      action: "admin_npc_buylist_remove",
      ipAddress: clientIp(req),
      details: { buyListId, itemId },
    });
    return NextResponse.json(result);
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
