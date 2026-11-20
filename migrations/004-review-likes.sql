CREATE TABLE IF NOT EXISTS review_likes (
  id BIGSERIAL PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);