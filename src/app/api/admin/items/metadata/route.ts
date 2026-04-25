import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

const CACHE_KEY = "admin:items:metadata";
const CACHE_TTL_SEC = 24 * 60 * 60; // 24h — items.json é estático

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
  } catch (e) {
    console.warn("[items/metadata] redis read falhou:", (e as Error).message);
  }

  try {
    const fresh = await bridge.gm.getItemsMetadata();
    const json = JSON.stringify(fresh);
    redis.set(CACHE_KEY, json, "EX", CACHE_TTL_SEC).catch(() => {
      // cache write fail — segue
    });
    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=86400",
        "X-L2-Cache": "miss",
      },
    });
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}

export async function DELETE() {
  // Limpa cache (admin pode forçar refresh após re-gerar items.json na bridge)
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  try {
    await redis.del(CACHE_KEY);
  } catch {
    /* noop */
  }
  return NextResponse.json({ ok: true });
}
