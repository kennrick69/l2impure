-- Fase Admin 6 — Welcome message multi-line + Epic Boss respawn + Seven Signs
-- always-active no painel /admin/events/config.
-- Seed com os valores REAIS lidos da VPS em 2026-07-12 (npcs.properties +
-- custom.properties). Idempotente (ON CONFLICT DO NOTHING / guard no UPDATE).
-- Rollback: DELETE FROM event_configs WHERE slug = 'welcome' OR slug LIKE 'boss.%';
--           UPDATE event_configs SET config = config - 'alwaysActive',
--             file_mapping = file_mapping - 'alwaysActive' WHERE slug='sevensigns';

INSERT INTO "event_configs" ("slug", "display_name", "enabled", "config", "file_target", "file_mapping") VALUES

-- Mensagem de login (welcome). Linha inicial = texto legado que já roda hoje.
('welcome', 'Mensagem de Login', true,
 '{"serverName": "L2 Impure", "lines": "Bem-vindo ao L2 Impure! Vote e ganhe premios!"}',
 'custom.properties',
 '{"enabled": "ActiveWellcomeMessageOnLogin", "serverName": "WellcomeMessageServerName", "lines1": "WellcomeMessageLine1", "lines2": "WellcomeMessageLine2", "lines3": "WellcomeMessageLine3", "lines4": "WellcomeMessageLine4", "lines5": "WellcomeMessageLine5"}'),

-- Epic bosses — atenção: keys de interval do Queen Ant são "AntQueen*" mas a
-- de cron é "QueenAnt*" (inconsistência do próprio aCis, conferida no Config).
('boss.queenant', 'Queen Ant', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "AntQueenSpawnInterval", "randomHours": "AntQueenRandomSpawn", "cronPattern": "QueenAntRespawnTimePattern"}'),

('boss.core', 'Core', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "CoreSpawnInterval", "randomHours": "CoreRandomSpawn", "cronPattern": "CoreRespawnTimePattern"}'),

('boss.orfen', 'Orfen', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "OrfenSpawnInterval", "randomHours": "OrfenRandomSpawn", "cronPattern": "OrfenRespawnTimePattern"}'),

('boss.zaken', 'Zaken', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "ZakenSpawnInterval", "randomHours": "ZakenRandomSpawn", "cronPattern": "ZakenRespawnTimePattern"}'),

('boss.baium', 'Baium', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "BaiumSpawnInterval", "randomHours": "BaiumRandomSpawn", "cronPattern": "BaiumRespawnTimePattern"}'),

('boss.antharas', 'Antharas', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "AntharasSpawnInterval", "randomHours": "AntharasRandomSpawn", "cronPattern": "AntharasRespawnTimePattern"}'),

('boss.valakas', 'Valakas', true,
 '{"intervalHours": 7, "randomHours": 1, "cronPattern": ""}',
 'npcs.properties',
 '{"intervalHours": "ValakasSpawnInterval", "randomHours": "ValakasRandomSpawn", "cronPattern": "ValakasRespawnTimePattern"}'),

-- Frintezza e Sailren NÃO têm key de cron no aCis — só interval.
('boss.frintezza', 'Frintezza', true,
 '{"intervalHours": 48, "randomHours": 8}',
 'npcs.properties',
 '{"intervalHours": "FrintezzaSpawnInterval", "randomHours": "FrintezzaRandomSpawn"}'),

('boss.sailren', 'Sailren', true,
 '{"intervalHours": 36, "randomHours": 24}',
 'npcs.properties',
 '{"intervalHours": "SailrenSpawnInterval", "randomHours": "SailrenRandomSpawn"}')

ON CONFLICT ("slug") DO NOTHING;

-- Seven Signs: campo novo alwaysActive (default false = calendário normal).
-- Key SevenSignsAlwaysActive é custom (patch Java Fase Admin 6) em events.properties.
UPDATE "event_configs" SET
  "config" = "config" || '{"alwaysActive": false}'::jsonb,
  "file_mapping" = "file_mapping" || '{"alwaysActive": "SevenSignsAlwaysActive"}'::jsonb
WHERE "slug" = 'sevensigns' AND NOT ("config" ? 'alwaysActive');
