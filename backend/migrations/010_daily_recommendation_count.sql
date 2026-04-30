-- Sprint 3 Story #4: Daily recommendation rate limit for free tier
-- Tracks per-user daily AI recommendation usage. Reset on date change.

ALTER TABLE users
  ADD COLUMN daily_recommendation_count INT NOT NULL DEFAULT 0,
  ADD COLUMN daily_recommendation_date DATE NULL;
