import { redis } from "./redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Sliding-window rate limit via Redis INCR + EXPIRE.
 * Chave: "rl:{namespace}:{identifier}" (ex: "rl:login:127.0.0.1")
 *
 * Se Redis estiver fora, fail-open (permite a request) e loga o erro.
 * Em produção considerar fail-closed para endpoints críticos.
 */
export async function rateLimit(
  namespace: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rl:${namespace}:${identifier}`;
  try {
    const [count, ttl] = await Promise.all([
      redis.incr(key),
      redis.ttl(key),
    ]);
    if (count === 1 || ttl === -1) {
      await redis.expire(key, windowSeconds);
    }
    const effectiveTtl = ttl > 0 ? ttl : windowSeconds;
    const resetAt = Date.now() + effectiveTtl * 1000;
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt,
    };
  } catch (e) {
    console.error("[rate-limit] redis error, fail-open:", (e as Error).message);
    return {
      allowed: true,
      remaining: max,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }
}

/**
 * Limites do doc L2-IMPURE-ARQUITETURA-DEFINITIVA.md § Rate Limiting
 */
export const rateLimits = {
  login: { max: 5, window: 60 }, // 5/min/IP
  register: { max: 3, window: 3600 }, // 3/hora/IP
  forgotPassword: { max: 3, window: 3600 }, // 3/hora/email
  refresh: { max: 30, window: 60 }, // 30/min/user
  createGameAccount: { max: 5, window: 3600 }, // 5/hora/user
  default: { max: 60, window: 60 }, // 60/min/IP
} as const;

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
