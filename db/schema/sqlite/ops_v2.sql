-- ops v2 (SQLite) — append-only evidence/checkpoints and import jobs
CREATE TABLE IF NOT EXISTS ops_import_jobs (
  id                   TEXT PRIMARY KEY,
  source_url           TEXT,
  normalized_json_path TEXT,
  status               TEXT,
  error_msg            TEXT,
  created_at           INTEGER,
  updated_at           INTEGER
);

CREATE TABLE IF NOT EXISTS ops_evidence (
  id         TEXT PRIMARY KEY,
  run_id     TEXT NOT NULL,
  path       TEXT NOT NULL,
  sha        TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS ops_checkpoints (
  id           TEXT PRIMARY KEY,
  run_id       TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON ops_import_jobs(updated_at);
CREATE INDEX IF NOT EXISTS idx_evidence_run_id ON ops_evidence(run_id);
CREATE INDEX IF NOT EXISTS idx_ckpt_run_id     ON ops_checkpoints(run_id);

