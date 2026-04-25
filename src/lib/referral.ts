import { createHmac } from "node:crypto";

/**
 * Código de indicação determinístico por user.id, derivado via HMAC-SHA256
 * com JWT_SECRET. 10 hex chars = 40 bits → ~1 trilhão de possibilidades.
 *
 * Stateless: o mesmo userId sempre gera o mesmo código enquanto o
 * JWT_SECRET não rotaciona. Não armazena no DB.
 */
export function referralCodeFor(userId: number): string {
  const secret = process.env.JWT_SECRET ?? "dev-fallback-not-for-prod";
  const digest = createHmac("sha256", secret)
    .update(`ref:${userId}`)
    .digest("hex");
  return digest.slice(0, 10).toUpperCase();
}

export function referralUrl(userId: number, baseUrl?: string): string {
  const base =
    baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://l2impure.com";
  return `${base.replace(/\/$/, "")}/register?ref=${referralCodeFor(userId)}`;
}
