PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Core entities
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  tags TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT,
  content TEXT,
  meta_json TEXT,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,
  name TEXT,
  version INTEGER,
  meta_json TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE CASCADE,
  type TEXT,
  config_json TEXT,
  x REAL,
  y REAL
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE CASCADE,
  src TEXT,
  dst TEXT,
  meta_json TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  flow_id TEXT REFERENCES flows(id) ON DELETE SET NULL,
  status TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_flow ON runs(flow_id, started_at);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
  node_id TEXT,
  status TEXT,
  log_json TEXT,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT,
  kind TEXT,
  meta_json TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS mem_items (
  id TEXT PRIMARY KEY,
  tier INTEGER,
  key TEXT,
  value_json TEXT,
  score REAL,
  decay_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  item_type TEXT,
  item_id TEXT,
  model TEXT,
  dim INTEGER,
  vec BLOB,
  created_at INTEGER
);

-- FTS virtual tables
CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(title, content='threads', content_rowid='id');
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content='messages', content_rowid='id');
CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(path, kind, meta_json, content='artifacts', content_rowid='id');

