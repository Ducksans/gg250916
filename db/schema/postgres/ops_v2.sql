-- ops v2 (PostgreSQL)
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.import_jobs (
  id                   TEXT PRIMARY KEY,
  source_url           TEXT,
  normalized_json_path TEXT,
  status               TEXT,
  error_msg            TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.evidence (
  id         TEXT PRIMARY KEY,
  run_id     TEXT NOT NULL,
  path       TEXT NOT NULL,
  sha        TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.checkpoints (
  id           TEXT PRIMARY KEY,
  run_id       TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON ops.import_jobs(updated_at);
CREATE INDEX IF NOT EXISTS idx_evidence_run_id ON ops.evidence(run_id);
CREATE INDEX IF NOT EXISTS idx_ckpt_run_id     ON ops.checkpoints(run_id);

