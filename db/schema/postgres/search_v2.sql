-- search v2 (PostgreSQL)
CREATE OR REPLACE VIEW public.content_search_view AS
SELECT
  i.id, i.slug, i.title, i.summary, i.thumbnail_url, i.updated_at,
  (SELECT json_agg(t.name) FROM content.item_tags it
     JOIN content.tags t ON t.id = it.tag_id WHERE it.item_id = i.id) AS tags,
  i.links_json
FROM content.items i;

