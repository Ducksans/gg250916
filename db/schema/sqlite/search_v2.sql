-- search v2 (SQLite) — already defined simple view; place-holder for future joins
CREATE VIEW IF NOT EXISTS content_search_view AS
SELECT id, slug, title, summary, thumbnail_url, updated_at, links_json
FROM content_items;

