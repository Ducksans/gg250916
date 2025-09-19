-- content v2 (SQLite)
CREATE TABLE IF NOT EXISTS content_items (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  body_mdx_path TEXT,
  thumbnail_url TEXT,
  price_plan    TEXT,
  features_json TEXT DEFAULT '[]',
  links_json    TEXT DEFAULT '{}',
  updated_at    INTEGER
);

CREATE TABLE IF NOT EXISTS content_tags (
  id   TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_item_tags (
  item_id TEXT NOT NULL,
  tag_id  TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS content_collections (
  id   TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_collection_items (
  collection_id TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  ord           INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, item_id)
);

CREATE VIEW IF NOT EXISTS content_search_view AS
SELECT id, slug, title, summary, thumbnail_url, updated_at, links_json
FROM content_items;

