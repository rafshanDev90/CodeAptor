-- Create conversations table for agent memory
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS conversations (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  session_id  TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content     TEXT NOT NULL,
  embedding   VECTOR(768),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations (created_at DESC);

-- Full-text search index (fallback for semantic search)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_conversations_fts ON conversations USING GIN (content_tsv);
