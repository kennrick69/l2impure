import { prisma } from "./db";

/**
 * Settings runtime — chave/valor em PG. Editáveis pelo admin via UI;
 * lidos por consumers (layout do dashboard, /api/promo-codes/redeem,
 * etc) toda vez que precisam.
 */
const SETTINGS_KEYS = {
  playerCountOffset: "player_count_offset",
  referralsEnabled: "referrals_enabled",
  referralRewardReferrer: "referral_reward_referrer",
  referralRewardReferred: "referral_reward_referred",
} as const;

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export const SETTINGS = SETTINGS_KEYS;

export async function getSetting<T = unknown>(
  key: SettingKey,
  defaultValue: T,
): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return defaultValue;
  return row.value as T;
}

export async function setSetting<T>(key: SettingKey, value: T): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.setting.findMany();
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}
