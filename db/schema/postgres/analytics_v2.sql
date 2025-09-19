-- analytics v2 (PostgreSQL)
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.events (
  id           TEXT PRIMARY KEY,
  ts           TIMESTAMPTZ NOT NULL,
  page         TEXT,
  session_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  ref          TEXT,
  conv_type    TEXT,
  meta_json    JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON analytics.events(ts);

