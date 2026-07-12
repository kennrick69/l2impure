/**
 * Secrets operacionais editáveis pelo painel (/admin/settings/secrets).
 *
 * Armazenamento: tabela admin_secrets, valor SEMPRE ciphertext
 * AES-256-GCM em base64 no formato iv(12) | ciphertext | tag(16).
 *
 * Chave-mestra: derivada de JWT_SECRET com salt fixo via scrypt —
 * funciona sem env var nova.
 *
 *   ATENÇÃO: se JWT_SECRET rotacionar, TODOS os secrets do DB viram
 *   lixo (decrypt falha) e precisam ser re-encriptados/re-colados.
 *   Ver SECRETS_ROTACAO.md antes de mexer em JWT_SECRET.
 *
 * Leitura em runtime: getSecret(key, ENV_FALLBACK) — DB tem prioridade,
 * env var é fallback. Cache em memória de 30s pra não bater no DB em
 * toda request.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const SCRYPT_SALT = "l2impure-secrets-master-2026";

// Lazy: evita rodar scrypt no import (build do Next avalia módulos sem
// todas as env vars de runtime).
let masterKey: Buffer | null = null;
function getMasterKey(): Buffer {
  if (!masterKey) {
    masterKey = scryptSync(env.JWT_SECRET ?? "", SCRYPT_SALT, 32);
  }
  return masterKey;
}

export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return "";
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}

// ---------- Catálogo ----------

export type SecretDef = {
  key: string;
  category: string;
  label: string;
  description: string;
  /** Nome da env var usada como fallback (e fonte do bootstrap). */
  envFallback?: string;
  /** Default NÃO-secreto (ex: URL pública) aplicado no bootstrap se DB e env vazios. */
  defaultValue?: string;
  /** true → painel mostra alerta amarelo enquanto vazio. */
  required?: boolean;
};

export const SECRET_CATALOG: SecretDef[] = [
  {
    key: "mp.access_token",
    category: "mercadopago",
    label: "Access Token",
    description:
      "Credencial privada do Mercado Pago (APP_USR-…). Usada em toda chamada server-side à API MP: criar preferência, consultar pagamento, refund.",
    envFallback: "MP_ACCESS_TOKEN",
    required: true,
  },
  {
    key: "mp.public_key",
    category: "mercadopago",
    label: "Public Key",
    description:
      "Chave publicável do Mercado Pago (APP_USR-…). Usada pelo checkout no browser.",
    envFallback: "MP_PUBLIC_KEY",
  },
  {
    key: "mp.webhook_url",
    category: "mercadopago",
    label: "Webhook URL",
    description:
      "URL de notificação enviada ao MP ao criar preferências de pagamento.",
    envFallback: "MP_WEBHOOK_URL",
    defaultValue: "https://l2impure.com/api/wallet/webhook",
  },
  {
    key: "mp.webhook_secret",
    category: "mercadopago",
    label: "Webhook Secret",
    description:
      "Assinatura secreta do webhook (painel MP → Suas integrações → Webhooks). OBRIGATÓRIO: sem ele o webhook responde 503 e nenhum pagamento é creditado.",
    envFallback: "MP_WEBHOOK_SECRET",
    required: true,
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  mercadopago: "Mercado Pago",
  smtp: "SMTP",
  recaptcha: "reCAPTCHA",
  general: "Geral",
};

// ---------- Leitura com cache ----------

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: string; expires: number }>();

function cleanEnv(v: string | undefined): string {
  if (!v) return "";
  const m = v.match(/^["'](.+)["']$/);
  return m ? m[1] : v;
}

/**
 * Lê secret com prioridade: DB (admin_secrets) → env var (fallback).
 * Retorna null se ambos vazios. Nunca lança — erro de DB/decrypt cai
 * no fallback de env.
 */
export async function getSecret(
  key: string,
  envFallback?: string,
): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value || null;

  let value = "";
  try {
    const row = await prisma.adminSecret.findUnique({ where: { key } });
    if (row?.value) {
      try {
        value = decrypt(row.value);
      } catch (e) {
        console.error(
          `[secrets] decrypt falhou pra ${key} (JWT_SECRET rotacionou?):`,
          (e as Error).message,
        );
      }
    }
  } catch (e) {
    console.error(`[secrets] leitura DB falhou pra ${key}:`, (e as Error).message);
  }
  if (!value && envFallback) value = cleanEnv(process.env[envFallback]);
  cache.set(key, { value, expires: now + CACHE_TTL_MS });
  return value || null;
}

export function invalidateCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

// ---------- Máscara (nunca expor plaintext no GET admin) ----------

export function maskSecret(v: string): string {
  if (!v) return "";
  if (v.length <= 8) return "••••••••";
  if (v.length <= 16) return v.slice(0, 2) + "••••" + v.slice(-2);
  return v.slice(0, 8) + "••••" + v.slice(-4);
}

// ---------- Bootstrap ----------

/**
 * Garante que todo secret do catálogo tem linha no DB e, se a linha está
 * vazia mas existe env var (ou defaultValue não-secreto), encripta e
 * persiste. Idempotente; nunca sobrescreve valor já setado pelo painel.
 * Chamado no GET /api/admin/secrets (abrir o painel já semeia).
 */
export async function bootstrapSecrets(): Promise<void> {
  for (const def of SECRET_CATALOG) {
    try {
      const row = await prisma.adminSecret.findUnique({
        where: { key: def.key },
      });
      if (row?.value) continue;

      const envVal = def.envFallback ? cleanEnv(process.env[def.envFallback]) : "";
      const plain = envVal || def.defaultValue || "";
      const updatedBy = plain
        ? envVal
          ? "bootstrap:env"
          : "bootstrap:default"
        : null;

      if (!row) {
        await prisma.adminSecret.create({
          data: {
            key: def.key,
            value: plain ? encrypt(plain) : "",
            category: def.category,
            description: def.description,
            updatedBy,
          },
        });
        if (plain) invalidateCache(def.key);
      } else if (plain) {
        await prisma.adminSecret.update({
          where: { key: def.key },
          data: { value: encrypt(plain), updatedBy },
        });
        invalidateCache(def.key);
      }
    } catch (e) {
      console.error(`[secrets] bootstrap falhou pra ${def.key}:`, (e as Error).message);
    }
  }
}
