-- Coaches saving exercises they like, so they can find them again. Counting the rows per exercise
-- shows how many coaches saved it
CREATE TABLE exercise_favorites (
  exercise_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (exercise_id, user_id),
  INDEX idx_exercise_favorites_user (user_id, created_at),
  CONSTRAINT fk_exercise_favorites_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
  CONSTRAINT fk_exercise_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
