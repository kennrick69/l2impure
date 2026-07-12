-- Comandos GM agendados — o site cria via POST /scheduled-commands (HMAC),
-- o scheduler da bridge (bridge/src/scheduler.ts, tick 30s) move pra
-- gm_commands quando scheduled_at <= NOW(); daí o fluxo é o normal da fila
-- (gameserver polla e executa).
--
-- Timezone: MySQL da VPS roda em UTC (session tz SYSTEM=UTC) — scheduled_at
-- é salvo/comparado em UTC; a UI do site converte pra BRT na exibição.
--
-- Aplicar como root:  mysql l2jdb < 006-scheduled-commands.sql

CREATE TABLE IF NOT EXISTS scheduled_gm_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  payload JSON NOT NULL,
  requested_by VARCHAR(128) NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_at TIMESTAMP NOT NULL,
  fired_at TIMESTAMP NULL,           -- NULL = ainda não disparado
  gm_command_id INT NULL,            -- id na gm_commands quando disparado
  cancelled_at TIMESTAMP NULL,
  INDEX idx_pending (scheduled_at, fired_at, cancelled_at)
);

-- GRANT SEPARADO (mesmo bug do 003/005). Rodar como root:
--   mysql -e "GRANT SELECT, INSERT, UPDATE ON l2jdb.scheduled_gm_commands TO 'l2jbridge'@'localhost'; FLUSH PRIVILEGES;"
