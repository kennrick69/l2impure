import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  REFRESH_COOKIE,
  signAccessToken,
  validateRefreshToken,
  revokeRefreshToken,
  createAndStoreRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { rateLimit, rateLimits, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const v = await validateRefreshToken(refresh);
  if (!v) {
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 },
    );
  }

  const rl = await rateLimit(
    "refresh",
    String(v.userId),
    rateLimits.refresh.max,
    rateLimits.refresh.window,
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: v.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  // Refresh token rotation: revoga o atual, emite um novo
  await revokeRefreshToken(refresh);
  const accessToken = signAccessToken(user);
  const { token: newRefresh, expiresAt } = await createAndStoreRefreshToken(
    user.id,
  );
  await setAuthCookies({
    accessToken,
    refreshToken: newRefresh,
    refreshExpiresAt: expiresAt,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = ip; // reservado para logging futuro
  return NextResponse.json({ user });
}
