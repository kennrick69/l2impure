-- Fila de comandos GM — painel admin grava (via bridge HMAC), gameserver
-- polla GET /gm-commands/pending e reporta POST /gm-commands/:id/result.
-- Mesmo padrão do vote system (002): tabela vive no MySQL da VPS porque a
-- bridge é quem faz a ponte site<->gameserver; o Postgres do site guarda
-- só o audit log (quem pediu o quê).
--
-- Aplicar como root:  mysql l2jdb < 003-gm-commands.sql

CREATE TABLE IF NOT EXISTS gm_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  priority INT NOT NULL DEFAULT 0,
  requested_by VARCHAR(128) NOT NULL,             -- email do admin no site
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,                      -- quando o gameserver pegou (running)
  executed_at TIMESTAMP NULL,                     -- quando reportou resultado
  result JSON NULL,                               -- {ok, message} do gameserver ou erro de timeout
  INDEX idx_status_prio (status, priority, id),
  INDEX idx_requested_at (requested_at)
);

-- IMPORTANTE: GRANT precisa rodar SEM `USE l2jdb;` no contexto — se aplicar
-- com `mysql l2jdb < 003-gm-commands.sql`, o GRANT é silenciosamente ignorado
-- em algumas versões do MariaDB/MySQL. Rodar separadamente como root:
--   mysql -e "GRANT SELECT, INSERT, UPDATE ON l2jdb.gm_commands TO 'l2jbridge'@'localhost'; FLUSH PRIVILEGES;"
