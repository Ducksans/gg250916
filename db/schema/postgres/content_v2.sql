-- content v2 (PostgreSQL)
CREATE SCHEMA IF NOT EXISTS content;

CREATE TABLE IF NOT EXISTS content.items (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  body_mdx_path TEXT,
  thumbnail_url TEXT,
  price_plan    TEXT,
  features_json JSONB DEFAULT '[]',
  links_json    JSONB DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content.tags (
  id   TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content.item_tags (
  item_id TEXT NOT NULL REFERENCES content.items(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES content.tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS content.collections (
  id   TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content.collection_items (
  collection_id TEXT NOT NULL REFERENCES content.collections(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL REFERENCES content.items(id)       ON DELETE CASCADE,
  ord           INT DEFAULT 0,
  PRIMARY KEY (collection_id, item_id)
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON content.items(updated_at);
CREATE INDEX IF NOT EXISTS idx_items_title_trgm   ON content.items USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_summary_trgm ON content.items USING GIN (summary gin_trgm_ops);

