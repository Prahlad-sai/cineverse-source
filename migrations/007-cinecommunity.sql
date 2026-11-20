CREATE TABLE IF NOT EXISTS community_profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  favorite_genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(handle) BETWEEN 3 AND 24),
  CHECK (char_length(display_name) BETWEEN 1 AND 40),
  CHECK (char_length(bio) <= 240)
);

CREATE TABLE IF NOT EXISTS community_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_community_profiles_handle ON community_profiles(handle);