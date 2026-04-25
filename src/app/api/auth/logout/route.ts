import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  revokeRefreshToken,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    try {
      await revokeRefreshToken(refresh);
    } catch (e) {
      console.error("[logout] revoke failed:", e);
    }
  }
  await clearAuthCookies();
  await audit({ action: "logout", ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
