-- Each coach's own star rating of an exercise, so the library can filter and sort by it. A cleared
-- rating stays as stars NULL, so an older change from another device can't bring it back
CREATE TABLE exercise_ratings (
  exercise_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  stars TINYINT UNSIGNED NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (exercise_id, user_id),
  INDEX idx_exercise_ratings_user (user_id, updated_at),
  CONSTRAINT fk_exercise_ratings_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
  CONSTRAINT fk_exercise_ratings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
