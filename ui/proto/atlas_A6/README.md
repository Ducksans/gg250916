# A6 Atlas — Read‑only Shell (MVP)

Purpose
- Provide a single “ground truth” viewing surface for structure and records.
- Keep all views read‑only; writes go only through approved APIs.
- Enable fact‑based collaboration even when peers cannot read the repo directly.

Scope (MVP)
- A6.1 House Map: SiteGraph SSV snapshot viewer (read‑only).
- A6.2 Docs: Semantic Structured Document Viewer (index + preview).
- A6.3 Checkpoints: JSONL chain daily view + tail with integrity badge.

Out of Scope (MVP)
- Any in‑UI editing, recomputation, or file writes.
- Historical diffs (time travel) and 3D graphs.

Data Sources (read‑only APIs)
- SiteGraph: GET /api/sitegraph/latest | /api/sitegraph/:id (JSON; schema: status/design/schemas/sitegraph.schema.json)
- Docs index: GET /api/docs/index (TBD in BT‑14 ST‑1408)
- Checkpoints: GET /api/checkpoints/view?date=YYYY‑MM‑DD&fmt=md, GET /api/checkpoints/tail?n=50
- All content is append‑only artifacts under gumgang_meeting/**

Information Architecture
- Tabs: [A1 Chat] … [A6 Atlas]
  - A6.1 House Map (SSV)
  - A6.2 Docs (SSDV)
  - A6.3 Checkpoints

Wireframes (ASCII)

A) A6 Shell (shared frame)
[TopBar: Atlas | Tab(A6.1/A6.2/A6.3) | Snapshot/Date pickers | Search | Help]
[Left Pane: Anchors/Lenses or Filters] | [Center: Main View] | [Right Pane: Inspector/Details]
[StatusBar: snapshot_id | created_at | layout_seed | chain_badge | warnings]

B) A6.1 House Map
[Top: Lens(Core/Hub/API/Memory/Runtime/Q) | K(level0/1) | Seed | Search]
[Left: Anchors (pinned) + Filters (bottleneck/isolation/edge-threshold)]
[Center: Sigma Canvas (nodes/edges; anchors pinned; labels Top‑K LOD)]
[Right: Inspector (id/kind/roles; scores; metadata; evidence links)]
[Bottom: meta(snapshot_id, created_at, chain badge passthrough)]

C) A6.2 Docs
[Top: Filters(status: Draft/Active/Deprecated/Archived) | Owner | Search]
[Left: Doc Index (tree/list, role tags)]
[Center: Preview (read‑only; frontmatter + excerpt)]
[Right: Metadata (links, supersedes/obsoletes, backlinks)]

D) A6.3 Checkpoints
[Top: Date picker (UTC today default) | fmt(md/json) toggle]
[Left: Calendar + quick ranges (today/yesterday/last 7d)]
[Center: MD View (6‑line blocks, EOF badge “효력은 EOF 기준”)]
[Right: Chain Panel (status OK/FAIL, tail(50), last_ts/hash/seq)]

Interactions (MVP)
- Global: Search “/”; Open in Atlas deeplinks from Chat.
- House Map: hover highlight; click select; Shift+click multi; a..i anchor jumps; b toggle bottleneck; i toggle isolation; 0 reset.
- Docs: Enter to open preview; filters with chips; copy path.
- Checkpoints: date change updates MD view; copy block; open evidence path.

Deep Links
- /ui/a6?tab=house-map&lens=Core
- /ui/a6?tab=docs&status=Active&owner=local
- /ui/a6?tab=checkpoints&date=2025-08-21&fmt=md

Safety & Integrity
- Read‑only UI; no write affordances.
- Checkpoints view is sourced from JSONL chain via view API; never from the .md file.
- Show chain badge (OK/FAIL) from GET /api/checkpoints/tail.

Performance Targets
- House Map: ≤ 500 nodes / ≤ 2,000 edges initial; render ≤ 1.5s.
- Docs index load ≤ 1.0s for ≤ 2k docs (paging if larger).
- Checkpoints daily render ≤ 0.5s typical.

Acceptance Criteria (A6 Shell MVP)
- A6 tab renders and switches among A6.1/A6.2/A6.3 without errors.
- All panels are read‑only; no filesystem mutations occur.
- House Map respects snapshot schema, pinned anchors, K/filters, stable seed.
- Docs list/preview works with frontmatter if present; no edit UI.
- Checkpoints: daily MD shows entries; tail(50) returns latest with chain OK; EOF badge visible.

Event Logging (optional; append‑only)
- If enabled: status/evidence/ui_house_map/events/<snapshot_id>.jsonl (selection/search/filter events; PII_STRICT).

Dependencies/References
- SiteGraph schema: status/design/schemas/sitegraph.schema.json
- House Map design: status/design/sitegraph/HOUSE_MAP_MVP.md
- Scanner plan: status/design/sitegraph/SCANNER_PLAN.md
- Checkpoint SSOT spec: status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md
- Hooks guide: status/design/checkpoints/HOOKS_SETUP.md

Roadmap Linkage (BT‑14)
- ST‑1404: A6 Shell (this spec; skeleton routes/layout; read‑only)
- ST‑1405: A6 Checkpoints panel using view/tail
- ST‑1406/1407: Scanner v0 + House Map MVP wiring
- ST‑1408: Docs indexer v0 + Docs panel

Notes
- Follow .rules v3.0: SAFE/NORMAL parity; append‑only evidence; PII_STRICT.
- UI must degrade gracefully on missing sources; show guidance instead of failing.
