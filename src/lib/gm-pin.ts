import bcrypt from "bcryptjs";
import { redis } from "./redis";

/**
 * PIN de 6 dígitos pra liberar o /admin/game-master por uma janela de
 * 30 min. Após expirar, novo unlock é exigido. Próximo às mutações
 * /api/admin/gm: cada POST checa o flag.
 */
const SESSION_TTL_SEC = 30 * 60;
const BCRYPT_ROUNDS = 10;

function sessionKey(userId: number): string {
  return `gm:pin:${userId}`;
}

export async function hashGmPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyGmPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function unlockGmSession(userId: number): Promise<void> {
  await redis.set(sessionKey(userId), "1", "EX", SESSION_TTL_SEC);
}

export async function isGmUnlocked(userId: number): Promise<boolean> {
  try {
    const v = await redis.get(sessionKey(userId));
    return v !== null;
  } catch {
    // Redis fora — fail-CLOSED em GM (ações irreversíveis).
    return false;
  }
}

export async function lockGmSession(userId: number): Promise<void> {
  try {
    await redis.del(sessionKey(userId));
  } catch {
    /* noop */
  }
}

export async function gmSessionTtl(userId: number): Promise<number> {
  try {
    return await redis.ttl(sessionKey(userId));
  } catch {
    return -1;
  }
}
