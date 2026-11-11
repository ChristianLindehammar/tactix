CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE api_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  CONSTRAINT fk_api_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exercises (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  cloned_from_id VARCHAR(64) NULL,
  schema_version SMALLINT NOT NULL,
  sport VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description MEDIUMTEXT NOT NULL,
  coaching_points LONGTEXT NOT NULL CHECK (JSON_VALID(coaching_points)),
  custom_tags LONGTEXT NOT NULL CHECK (JSON_VALID(custom_tags)),
  locale VARCHAR(16) NOT NULL,
  difficulty TINYINT NOT NULL,
  phase VARCHAR(16) NOT NULL,
  duration_minutes INT NULL,
  min_players INT NULL,
  max_players INT NULL,
  frames LONGTEXT NOT NULL CHECK (JSON_VALID(frames)),
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_exercises_owner FOREIGN KEY (owner_id) REFERENCES users (id),
  INDEX idx_exercises_owner_updated (owner_id, updated_at),
  INDEX idx_exercises_sport (sport, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE exercise_focus (
  exercise_id CHAR(36) NOT NULL,
  tag VARCHAR(32) NOT NULL,
  position TINYINT NOT NULL,
  PRIMARY KEY (exercise_id, tag),
  INDEX idx_exercise_focus_tag (tag),
  CONSTRAINT fk_exercise_focus_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
