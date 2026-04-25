import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias
const BCRYPT_ROUNDS = 12;

export const ACCESS_COOKIE = "l2i_access";
export const REFRESH_COOKIE = "l2i_refresh";

export type AccessTokenPayload = {
  sub: number; // user id
  email: string;
  iat?: number;
  exp?: number;
};

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET não está definida");
  return s;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(user: {
  id: number;
  email: string;
}): string {
  return jwt.sign(
    { sub: user.id, email: user.email } satisfies AccessTokenPayload,
    jwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret()) as unknown as AccessTokenPayload;
    if (typeof payload.sub !== "number" || typeof payload.email !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  // 256 bits opaco, URL-safe
  return randomBytes(32).toString("base64url");
}

export async function createAndStoreRefreshToken(
  userId: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
  return { token, expiresAt };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

export async function validateRefreshToken(
  token: string,
): Promise<{ userId: number } | null> {
  const row = await prisma.refreshToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.revoked) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return { userId: row.userId };
}

/**
 * Seta os dois cookies de auth (access + refresh) na response.
 * Para uso em API routes do App Router.
 */
export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}) {
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ACCESS_COOKIE, params.accessToken, {
    ...common,
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  store.set(REFRESH_COOKIE, params.refreshToken, {
    ...common,
    expires: params.refreshExpiresAt,
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Lê o cookie de access e retorna o payload, ou null se inválido/ausente.
 * Usar em Server Components / API routes protegidas.
 */
export async function getSession(): Promise<AccessTokenPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireSession(): Promise<AccessTokenPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Cria um token de verificação/reset (UUID opaco) e salva no banco.
 * Usado pra verificação de email e reset de senha.
 */
export async function createVerificationToken(
  userId: number,
  type: "verification" | "reset",
  ttlMinutes = 60,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.verificationToken.create({
    data: { userId, token, type, expiresAt },
  });
  return { token, expiresAt };
}

export async function consumeVerificationToken(
  token: string,
  type: "verification" | "reset",
): Promise<{ userId: number } | null> {
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.used) return null;
  if (row.type !== type) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await prisma.verificationToken.update({
    where: { id: row.id },
    data: { used: true },
  });
  return { userId: row.userId };
}
