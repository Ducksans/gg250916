-- analytics v2 (SQLite)
CREATE TABLE IF NOT EXISTS analytics_events (
  id           TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,
  page         TEXT,
  session_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  ref          TEXT,
  conv_type    TEXT,
  meta_json    TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON analytics_events(ts);

