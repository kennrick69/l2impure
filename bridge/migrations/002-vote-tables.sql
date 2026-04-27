-- Vote system tables
CREATE TABLE IF NOT EXISTS vote_pending (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site VARCHAR(32) NOT NULL,
  char_id INT NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed TINYINT(1) DEFAULT 0,
  claimed_at TIMESTAMP NULL,
  ip VARCHAR(45),
  INDEX idx_site_char (site, char_id, claimed),
  INDEX idx_voted_at (voted_at)
);

CREATE TABLE IF NOT EXISTS vote_cooldown (
  char_id INT NOT NULL,
  site VARCHAR(32) NOT NULL,
  last_vote TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (char_id, site)
);

CREATE TABLE IF NOT EXISTS vote_callback_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site VARCHAR(32) NOT NULL,
  payload TEXT,
  ip VARCHAR(45),
  status VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);
