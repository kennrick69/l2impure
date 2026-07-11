import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined;
}

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL não está definida");
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
  });
  client.on("error", (err) => {
    // Nunca deixar erros de Redis derrubarem o processo —
    // cache/rate-limit funcionam em fallback.
    console.error("[redis] error:", err.message);
  });
  return client;
}

export const redis: Redis = globalThis.redisClient ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalThis.redisClient = redis;
}

/**
 * TTL do snapshot stale (fallback quando o fetcher falha).
 * 24h: se a bridge/VPS cair, servimos o último dado bom por até 1 dia
 * em vez de quebrar a UI. O timestamp dentro do payload permite ao
 * consumer calcular a idade do dado.
 */
const STALE_TTL_SECONDS = 86400;

/**
 * Get-or-set cache helper com stale-while-error.
 *
 * - Retorna o valor cacheado se existir, senão executa `fetcher`,
 *   armazena (cache curto + snapshot stale de 24h) e retorna.
 * - Se o `fetcher` falhar (bridge fora, timeout, etc), serve o último
 *   snapshot stale se houver; só propaga o erro se nunca teve dado.
 * - Se Redis estiver fora, cai pro `fetcher` direto (sem cache).
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (e) {
    console.error("[redis] cache read failed:", (e as Error).message);
  }

  let fresh: T;
  try {
    fresh = await fetcher();
  } catch (err) {
    // Fallback: último snapshot bom (stale-while-error)
    try {
      const stale = await redis.get(`stale:${key}`);
      if (stale) {
        console.warn(
          `[redis] fetcher de "${key}" falhou (${(err as Error).message}) — servindo snapshot stale`,
        );
        return JSON.parse(stale) as T;
      }
    } catch (e) {
      console.error("[redis] stale read failed:", (e as Error).message);
    }
    throw err;
  }

  try {
    const json = JSON.stringify(fresh);
    await redis.set(key, json, "EX", ttlSeconds);
    await redis.set(`stale:${key}`, json, "EX", STALE_TTL_SECONDS);
  } catch (e) {
    console.error("[redis] cache write failed:", (e as Error).message);
  }
  return fresh;
}
