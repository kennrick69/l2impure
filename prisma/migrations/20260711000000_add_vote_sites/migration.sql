-- Vote sites (rankings de divulgação) — config editável pelo admin.
-- Rollback: DROP TABLE "vote_sites";

CREATE TABLE "vote_sites" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(32) NOT NULL,
    "display_name" VARCHAR(64) NOT NULL,
    "server_id" VARCHAR(64),
    "callback_url" VARCHAR(255) NOT NULL,
    "callback_method" VARCHAR(8) NOT NULL DEFAULT 'GET',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "cooldown_hours" INTEGER NOT NULL DEFAULT 12,
    "reward_coins" INTEGER NOT NULL DEFAULT 1,
    "reward_description" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vote_sites_slug_key" ON "vote_sites"("slug");
CREATE INDEX "vote_sites_active_idx" ON "vote_sites"("active");

-- Seed dos 5 rankings principais. Idempotente (ON CONFLICT DO NOTHING) —
-- todos nascem inativos; JOs ativa pelo painel quando cadastrar em cada um.
INSERT INTO "vote_sites"
    ("slug", "display_name", "callback_url", "callback_method", "cooldown_hours", "reward_coins", "reward_description", "notes")
VALUES
    ('hopzone',  'HopZone (l2.hopzone.net)', 'https://bridge.l2impure.com/vote/callback/hopzone',  'GET',  12, 1, '1 vote coin',
     'Callback implementado na bridge (HMAC). Cadastro: l2.hopzone.net → Add Server.'),
    ('l2topco',  'L2Top.CO',                 'https://bridge.l2impure.com/vote/callback/l2topco',  'POST', 12, 1, '1 vote coin',
     'Callback implementado na bridge (IP whitelist via L2TOP_CO_WHITELIST_IPS). Cadastro: l2top.co → Add Server.'),
    ('mmotop',   'MMOTop',                   'https://bridge.l2impure.com/vote/callback/mmotop',   'GET',  24, 1, '1 vote coin',
     'ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. Ranking russo-cêntrico (plano de negócio marcou como baixa prioridade BR).'),
    ('l2servera','L2-Servera.com',           'https://bridge.l2impure.com/vote/callback/l2servera','GET',  12, 1, '1 vote coin',
     'ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. Obrigatório cadastrar o LAUNCH no calendário de openings.'),
    ('gtop100',  'GTop100',                  'https://bridge.l2impure.com/vote/callback/gtop100',  'POST', 24, 1, '1 vote coin',
     'ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. GTop100 usa postback POST (pingback URL).')
ON CONFLICT ("slug") DO NOTHING;
