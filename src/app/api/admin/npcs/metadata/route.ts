import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

const CACHE_KEY = "admin:npcs:metadata";
const CACHE_TTL_SEC = 24 * 60 * 60;

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=86400",
          "X-L2-Cache": "hit",
        },
      });
    }
  } catch {
    /* fail-soft */
  }
  try {
    const data = await bridge.gm.getNpcsMetadata();
    const json = JSON.stringify(data);
    redis.set(CACHE_KEY, json, "EX", CACHE_TTL_SEC).catch(() => {});
    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "X-L2-Cache": "miss",
      },
    });
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

export async function DELETE() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  try {
    await redis.del(CACHE_KEY);
    await bridge.gm.clearNpcCache();
  } catch {
    /* noop */
  }
  return NextResponse.json({ ok: true });
}
