import { randomBytes } from "node:crypto";

/**
 * Recompensas e parâmetros do programa de indicações.
 * Constantes hardcoded por enquanto — quando o admin /admin/referrals
 * for implementado, virar entradas configuráveis em runtime.
 */
export const REFERRAL_TARGET_LEVEL = 40;
export const REFERRAL_REWARD_REFERRER = 3;
export const REFERRAL_REWARD_REFERRED = 2;

/**
 * Código de indicação opaco gerado no momento da criação do user e
 * salvo em `users.referral_code` (UNIQUE). 10 chars hex (uppercase) =
 * 16^10 = ~1.1 trilhão de possibilidades — suficiente.
 */
export function generateReferralCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function referralUrl(code: string, baseUrl?: string): string {
  const base =
    baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://l2impure.com";
  return `${base.replace(/\/$/, "")}/register?ref=${code}`;
}
