ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created
  ON quiz_attempts (user_id, created_at DESC);