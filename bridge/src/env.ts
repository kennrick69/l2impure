/**
 * Validação de env vars no startup. Zod garante que tudo necessário
 * existe antes do servidor subir.
 */
import { z } from "zod";

const Schema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1, "DB_USER obrigatório"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD obrigatório"),
  DB_NAME: z.string().default("l2jdb"),

  API_KEY: z
    .string()
    .min(16, "API_KEY precisa ter no mínimo 16 chars (use openssl rand -hex 32)"),
  HMAC_SECRET: z
    .string()
    .min(32, "HMAC_SECRET precisa ter no mínimo 32 chars (use openssl rand -hex 64)"),
  HMAC_MAX_SKEW_MS: z.coerce.number().int().positive().default(30000),

  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("127.0.0.1"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),

  L2J_LOGIN_HOST: z.string().default("127.0.0.1"),
  L2J_LOGIN_PORT: z.coerce.number().int().positive().default(2106),
  L2J_GAME_HOST: z.string().default("127.0.0.1"),
  L2J_GAME_PORT: z.coerce.number().int().positive().default(7777),

  // Marketing offset somado ao COUNT real de players em /status.
  // Permite valores negativos (esconder bots, etc). Default 0 = sem offset.
  PLAYER_COUNT_OFFSET: z.coerce.number().int().default(0),
});

const parsed = Schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] validação falhou:");
  console.error(JSON.stringify(parsed.error.flatten(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
