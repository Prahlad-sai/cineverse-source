CREATE TABLE IF NOT EXISTS user_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  movie_id BIGINT NOT NULL,
  movie_data JSONB NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('watchlist','watched','favourites')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, movie_id, kind)
);