CREATE TABLE rate_limits (
  key_hash CHAR(64) NOT NULL,
  window_start BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  hits INT NOT NULL,
  PRIMARY KEY (key_hash, window_start),
  INDEX idx_rate_limits_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
