-- Sprint 3 Story #7: User-saved style presets
-- A preset captures a named (occasion, weather, dress_code, preferred_styles) combination
-- that the user can re-apply later. Custom occasion strings are persisted here so they
-- can appear alongside default occasion options in future selections.

CREATE TABLE IF NOT EXISTS style_presets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  occasion VARCHAR(100) NULL,
  weather VARCHAR(50) NULL,
  dress_code VARCHAR(50) NULL,
  preferred_styles JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, created_at),
  UNIQUE KEY uniq_user_name (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
