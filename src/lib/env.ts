/**
 * Dicionário central de variáveis de ambiente.
 *
 * - Validação via zod no startup (detecta faltando logo no build/dev)
 * - Função clean() tira aspas literais que Railway às vezes preserva
 * - Server-only vars NUNCA são exportadas com prefixo NEXT_PUBLIC_
 *   (Next bloqueia exposição automática)
 * - Defaults razoáveis pra dev local; production exige certas vars
 *
 * Uso:
 *   import { env } from "@/lib/env";
 *   env.JWT_SECRET           // server-only
 *   env.NEXT_PUBLIC_SITE_URL // público (também acessível no client)
 *   env.emailProvider()      // helpers derivados
 */
import { z } from "zod";

function clean(v: string | undefined): string | undefined {
  if (!v) return v;
  const m = v.match(/^["'](.+)["']$/);
  return m ? m[1] : v;
}

function bool(v: string | undefined, fallback = false): boolean {
  if (v === undefined) return fallback;
  return clean(v) === "true" || clean(v) === "1";
}

const isProd = process.env.NODE_ENV === "production";

// ---------- Schema ----------

const ServerEnv = z.object({
  // Core
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL obrigatória"),
  REDIS_URL: z.string().min(1, "REDIS_URL obrigatória"),

  // Auth
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter no mínimo 16 chars"),
  JWT_REFRESH_SECRET: z.string().optional(),

  // Email — provider auto-detect via RESEND_API_KEY
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_DEBUG: z.string().optional(),

  // Anti-bot
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  RECAPTCHA_DISABLED: z.string().optional(),

  // Bridge VPS (Fase 3 — não usado ainda)
  BRIDGE_URL: z.string().optional(),
  BRIDGE_API_KEY: z.string().optional(),
  BRIDGE_HMAC_SECRET: z.string().optional(),

  // Rate limits (todos opcionais — defaults em rate-limit.ts)
  RATE_LIMIT_LOGIN_MAX: z.string().optional(),
  RATE_LIMIT_LOGIN_WINDOW: z.string().optional(),
  RATE_LIMIT_REGISTER_MAX: z.string().optional(),
  RATE_LIMIT_REGISTER_WINDOW: z.string().optional(),
  RATE_LIMIT_FORGOT_MAX: z.string().optional(),
  RATE_LIMIT_FORGOT_WINDOW: z.string().optional(),
  RATE_LIMIT_REFRESH_MAX: z.string().optional(),
  RATE_LIMIT_REFRESH_WINDOW: z.string().optional(),

  // Debug endpoints
  DEBUG_KEY: z.string().min(8, "DEBUG_KEY precisa ter no mínimo 8 chars").optional(),
  ENABLE_DEBUG_ENDPOINTS: z.string().optional(),
});

const PublicEnv = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://l2impure.com"),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_DISABLED: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE: z.string().optional(),
});

// ---------- Parse com clean() em todos os strings ----------

function rawWithClean<T extends Record<string, z.ZodTypeAny>>(
  shape: T,
): Record<keyof T, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of Object.keys(shape)) {
    out[k] = clean(process.env[k]);
  }
  return out as Record<keyof T, string | undefined>;
}

const serverParsed = ServerEnv.safeParse(rawWithClean(ServerEnv.shape));
const publicParsed = PublicEnv.safeParse(rawWithClean(PublicEnv.shape));

// Nunca dá throw — Railway build não tem acesso a TODAS as env vars
// runtime, e validação que falha hard quebra o build mesmo quando a app
// rodaria normalmente em produção. Loga warning aqui; downstream
// (Prisma, jwt.sign, fetch ao Resend, etc) falha com mensagem clara
// se a var realmente faltar em runtime.
if (!serverParsed.success) {
  console.warn(
    `[env] server validation warning:\n${JSON.stringify(serverParsed.error.flatten(), null, 2)}`,
  );
}
if (!publicParsed.success) {
  console.warn(
    `[env] public validation warning:\n${JSON.stringify(publicParsed.error.flatten(), null, 2)}`,
  );
}

// ---------- Export ----------

const serverEnv = serverParsed.success
  ? serverParsed.data
  : (rawWithClean(ServerEnv.shape) as z.infer<typeof ServerEnv>);

const publicEnv = publicParsed.success
  ? publicParsed.data
  : (rawWithClean(PublicEnv.shape) as z.infer<typeof PublicEnv>);

export const env = {
  ...serverEnv,
  ...publicEnv,

  // Helpers derivados — não setáveis via process.env
  isProd,
  isDev: !isProd,

  /** "resend" se RESEND_API_KEY definido, senão "smtp" (Nodemailer Hostinger) */
  emailProvider(): "resend" | "smtp" {
    return serverEnv.RESEND_API_KEY ? "resend" : "smtp";
  },

  /** From padrão pra emails — RESEND_FROM > SMTP_FROM > fallback hardcoded */
  emailFrom(): string {
    return (
      serverEnv.RESEND_FROM ||
      serverEnv.SMTP_FROM ||
      `L2 Impure <${serverEnv.SMTP_USER ?? "admin@l2impure.com"}>`
    );
  },

  /** Endpoints /api/debug/* devem responder? Default: true se DEBUG_KEY setada */
  debugEndpointsEnabled(): boolean {
    if (!serverEnv.DEBUG_KEY) return false;
    if (serverEnv.ENABLE_DEBUG_ENDPOINTS === "false") return false;
    return true;
  },

  /** reCAPTCHA server-side: bypass se RECAPTCHA_DISABLED=true ou sem secret */
  recaptchaDisabled(): boolean {
    return bool(serverEnv.RECAPTCHA_DISABLED) || !serverEnv.RECAPTCHA_SECRET_KEY;
  },
} as const;

export type Env = typeof env;
