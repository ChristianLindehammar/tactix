-- Exercises uploaded before the public library were saved as private work, so they stay private
ALTER TABLE exercises
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'private';

ALTER TABLE exercises
  ALTER COLUMN visibility SET DEFAULT 'public';

ALTER TABLE exercises
  ADD INDEX idx_exercises_library (visibility, deleted_at, updated_at)
;

-- Shown as the author of public exercises. The email address never is
ALTER TABLE users
  ADD COLUMN display_name VARCHAR(40) NULL
;

-- Set once enough coaches report an exercise, and cleared by the moderator if it's fine
ALTER TABLE exercises
  ADD COLUMN hidden_at DATETIME(3) NULL;

CREATE TABLE exercise_reports (
  exercise_id CHAR(36) NOT NULL,
  reporter_id CHAR(36) NOT NULL,
  reason VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (exercise_id, reporter_id),
  INDEX idx_exercise_reports_reporter (reporter_id),
  CONSTRAINT fk_exercise_reports_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
  CONSTRAINT fk_exercise_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

-- A coach who blocks another stops seeing anything they publish
CREATE TABLE user_blocks (
  blocker_id CHAR(36) NOT NULL,
  blocked_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  INDEX idx_user_blocks_blocked (blocked_id),
  CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
