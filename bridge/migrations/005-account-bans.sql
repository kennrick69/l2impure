-- Histórico de bans de conta — o ban efetivo é o access_level negativo na
-- accounts (login server recusa); esta tabela guarda QUEM/POR QUÊ/ATÉ QUANDO
-- pra tela /admin/moderation/bans do site e pro auto-expire do scheduler.
--
-- Escrita: gameserver (handler ban_account/unban_account do GmCommandPoller,
-- via ConnectionPool do fork) + bridge (auto-expire no scheduler).
-- Leitura: bridge GET /account-bans.
--
-- Aplicar como root:  mysql l2jdb < 005-account-bans.sql

CREATE TABLE IF NOT EXISTS account_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_login VARCHAR(48) NOT NULL,
  reason VARCHAR(200) NOT NULL,
  banned_by VARCHAR(128) NOT NULL,  -- email do admin no site
  banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,        -- NULL = permanente
  unbanned_at TIMESTAMP NULL,
  unbanned_by VARCHAR(128) NULL,    -- admin ou 'auto-expire'
  INDEX idx_login (account_login),
  INDEX idx_expires (expires_at)
)
-- Collation TEM que casar com a accounts (utf8mb4_0900_ai_ci nesta VPS),
-- senão o JOIN account_bans<->accounts do GET /account-bans explode com
-- "Illegal mix of collations" (aprendido no e2e de 2026-07-12).
DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- IMPORTANTE: GRANT precisa rodar SEPARADO (mesmo bug do 003 — silenciosamente
-- ignorado se aplicado com `mysql l2jdb < arquivo`). Rodar como root:
--   mysql -e "GRANT SELECT, INSERT, UPDATE ON l2jdb.account_bans TO 'l2jbridge'@'localhost'; FLUSH PRIVILEGES;"
