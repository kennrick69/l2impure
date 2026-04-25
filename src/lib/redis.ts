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
 * Get-or-set cache helper.
 * Retorna o valor cacheado se existir, senão executa `fetcher`, armazena e retorna.
 * Se Redis estiver fora, cai pro `fetcher` direto (sem cache).
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
  const fresh = await fetcher();
  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch (e) {
    console.error("[redis] cache write failed:", (e as Error).message);
  }
  return fresh;
}
