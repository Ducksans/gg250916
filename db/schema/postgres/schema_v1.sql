-- Requires PostgreSQL 16+, extensions: pgvector, (optional) rum
CREATE EXTENSION IF NOT EXISTS vector;

-- Core entities
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  tags TEXT,
  created_at BIGINT,
  updated_at BIGINT,
  title_fts tsvector
);
CREATE INDEX IF NOT EXISTS idx_threads_updated ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_fts ON threads USING GIN(title_fts);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT,
  content TEXT,
  meta_json JSONB,
  created_at BIGINT,
  content_fts tsvector
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING GIN(content_fts);

CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,
  name TEXT,
  version INT,
  meta_json JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE CASCADE,
  type TEXT,
  config_json JSONB,
  x REAL,
  y REAL
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE CASCADE,
  src TEXT,
  dst TEXT,
  meta_json JSONB
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE SET NULL,
  status TEXT,
  started_at BIGINT,
  finished_at BIGINT,
  meta_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_runs_flow ON runs(flow_id, started_at);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
  node_id TEXT,
  status TEXT,
  log_json JSONB,
  started_at BIGINT,
  finished_at BIGINT
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT,
  kind TEXT,
  meta_json JSONB,
  created_at BIGINT,
  path_fts tsvector
);
CREATE INDEX IF NOT EXISTS idx_artifacts_fts ON artifacts USING GIN(path_fts);

CREATE TABLE IF NOT EXISTS mem_items (
  id TEXT PRIMARY KEY,
  tier INT,
  key TEXT,
  value_json JSONB,
  score REAL,
  decay_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

-- Vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  item_type TEXT,
  item_id TEXT,
  model TEXT,
  dim INT,
  vec VECTOR(1024),
  created_at BIGINT
);
-- Example index (HNSW). Tune parameters to your workload.
CREATE INDEX IF NOT EXISTS idx_embeddings_vec ON embeddings USING hnsw (vec);

