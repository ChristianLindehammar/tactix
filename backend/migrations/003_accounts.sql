ALTER TABLE users
  ADD COLUMN email VARCHAR(254) NULL,
  ADD UNIQUE INDEX uq_users_email (email);

CREATE TABLE sign_in_codes (
  email_hash CHAR(64) NOT NULL PRIMARY KEY,
  code_hash CHAR(64) NOT NULL,
  expires_at BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_identities (
  provider VARCHAR(16) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (provider, subject),
  INDEX idx_user_identities_user (user_id),
  CONSTRAINT fk_user_identities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
