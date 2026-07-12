-- Audit trail das mudanças de config do gameserver aplicadas via bridge
-- (POST /config/apply e /config/reload-events do painel admin).
--
-- Aplicar:  mysql l2jdb < 004-config-audit.sql
--
-- ⚠️ GRANT vai SEPARADO (mesmo bug da 003: `mysql l2jdb < file` ignora
-- GRANT silenciosamente — MySQL 8 exige contexto global). Rodar depois:
--
--   mysql -e "GRANT SELECT, INSERT ON l2jdb.gameserver_config_audit TO 'l2jbridge'@'localhost'; FLUSH PRIVILEGES;"

CREATE TABLE IF NOT EXISTS gameserver_config_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_path VARCHAR(255) NOT NULL,
  changes JSON NOT NULL,
  backup_path VARCHAR(255) NOT NULL,
  applied_by VARCHAR(128) NOT NULL,
  INDEX idx_applied_at (applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
