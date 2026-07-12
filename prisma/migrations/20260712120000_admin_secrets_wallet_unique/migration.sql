-- Fase Admin 4 — painel de secrets criptografado + hardening do webhook MP.
-- Rollback: DROP TABLE "admin_secrets";
--           DROP INDEX "wallet_transactions_mp_payment_id_key";
--           CREATE INDEX "wallet_transactions_mp_payment_id_idx" ON "wallet_transactions"("mp_payment_id");

-- ============================================================
-- 1. admin_secrets — valores SEMPRE ciphertext AES-256-GCM
--    (base64(iv|ct|tag), chave derivada de JWT_SECRET via scrypt).
--    Seed abaixo cria só METADADOS (value vazio) — nenhum plaintext
--    é commitado. O bootstrap em runtime (src/lib/secrets.ts) encripta
--    e preenche a partir das env vars MP_* se existirem no Railway;
--    o que faltar, JOs cola no painel /admin/settings/secrets.
-- ============================================================
CREATE TABLE "admin_secrets" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "category" VARCHAR(32) NOT NULL DEFAULT 'general',
    "description" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(128),

    CONSTRAINT "admin_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_secrets_key_key" ON "admin_secrets"("key");

INSERT INTO "admin_secrets" ("key", "value", "category", "description") VALUES
('mp.access_token', '', 'mercadopago', 'Access Token privado do Mercado Pago (APP_USR-...). Usado em toda chamada server-side à API MP.'),
('mp.public_key', '', 'mercadopago', 'Public Key do Mercado Pago (APP_USR-...). Chave publicável usada pelo checkout.'),
('mp.webhook_url', '', 'mercadopago', 'URL de notificação (webhook) enviada ao MP ao criar preferências. Padrão: https://l2impure.com/api/wallet/webhook'),
('mp.webhook_secret', '', 'mercadopago', 'Assinatura secreta do webhook (painel MP > Webhooks). OBRIGATÓRIO antes de aceitar pagamentos — sem ele o webhook responde 503 e nada é creditado.')
ON CONFLICT ("key") DO NOTHING;

-- ============================================================
-- 2. CVE #3 — mp_payment_id sem UNIQUE permitia o mesmo pagamento MP
--    referenciado por 2 transações. Dedup defensivo antes do índice
--    (mantém a tx mais antiga, limpa o campo nas demais).
-- ============================================================
UPDATE "wallet_transactions" w
SET "mp_payment_id" = NULL
WHERE "mp_payment_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "wallet_transactions" w2
    WHERE w2."mp_payment_id" = w."mp_payment_id" AND w2."id" < w."id"
  );

DROP INDEX IF EXISTS "wallet_transactions_mp_payment_id_idx";
CREATE UNIQUE INDEX "wallet_transactions_mp_payment_id_key" ON "wallet_transactions"("mp_payment_id");
