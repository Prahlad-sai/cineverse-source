ALTER TABLE user_library ADD COLUMN IF NOT EXISTS watched_at TIMESTAMPTZ;
ALTER TABLE user_library ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS collection_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  collection_id UUID NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  movie_data JSONB NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_movies_user ON collection_movies(user_id, collection_id);