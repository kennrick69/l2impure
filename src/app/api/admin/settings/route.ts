import { NextResponse } from "next/server";
import { requireAdmin, AdminError } from "@/lib/admin";
import { setSetting, type SettingKey } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const ALLOWED_KEYS: readonly SettingKey[] = [
  "player_count_offset",
  "referrals_enabled",
  "referral_reward_referrer",
  "referral_reward_referred",
] as const;

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = raw.key;
  if (typeof key !== "string" || !ALLOWED_KEYS.includes(key as SettingKey)) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 400 });
  }
  const value = raw.value;

  // value === null → apaga o setting (reset pra default)
  if (value === null) {
    await prisma.setting.deleteMany({ where: { key } });
  } else {
    await setSetting(key as SettingKey, value);
  }

  await audit({
    userId: admin.userId,
    action: "admin_set_setting",
    ipAddress: clientIp(req),
    details: { key, value },
  });
  return NextResponse.json({ ok: true });
}
