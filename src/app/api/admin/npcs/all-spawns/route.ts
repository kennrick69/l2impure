import { redis } from "@/lib/redis";
import { bridge } from "@/lib/bridge";
import { requireAdminApi, bridgeErrorResponse } from "@/lib/admin-gm-helpers";

const CACHE_KEY = "admin:npcs:all-spawns";
const CACHE_TTL_SEC = 5 * 60; // 5min — spawns mudam quando admin edita

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300",
        },
      });
    }
  } catch {
    /* fail-soft */
  }
  try {
    const data = await bridge.gm.getAllNpcSpawns();
    const json = JSON.stringify(data);
    redis.set(CACHE_KEY, json, "EX", CACHE_TTL_SEC).catch(() => {});
    return new Response(json, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return bridgeErrorResponse(e);
  }
}
