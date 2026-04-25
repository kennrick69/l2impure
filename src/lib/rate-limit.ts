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
/**
 * Os limites default podem ser sobrescritos por env vars
 * (ex: RATE_LIMIT_REGISTER_MAX=20, RATE_LIMIT_REGISTER_WINDOW=3600).
 * Útil pra afrouxar durante testes sem mudar código.
 */
function envLimit(name: string, defaultMax: number, defaultWindow: number) {
  const max = Number(
    process.env[`RATE_LIMIT_${name}_MAX`] ?? defaultMax,
  );
  const window = Number(
    process.env[`RATE_LIMIT_${name}_WINDOW`] ?? defaultWindow,
  );
  return { max, window };
}

export const rateLimits = {
  login: envLimit("LOGIN", 5, 60), // 5/min/IP
  register: envLimit("REGISTER", 10, 3600), // 10/hora/IP (afrouxado de 3)
  forgotPassword: envLimit("FORGOT", 3, 3600), // 3/hora/email
  refresh: envLimit("REFRESH", 30, 60), // 30/min/user
  createGameAccount: envLimit("CREATE_GAME_ACCOUNT", 5, 3600), // 5/hora/user
  default: envLimit("DEFAULT", 60, 60), // 60/min/IP
} as const;

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
