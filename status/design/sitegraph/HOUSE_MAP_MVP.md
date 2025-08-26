# A1 House Map MVP — Design v1 (BT-14 ST-1401)

Purpose
- Deliver a read-only, evidence-first graph viewer (Semantic Structure Viewer, SSV) of the repository.
- Enable deterministic, stable navigation of core subgraphs with role-based styling and badges.
- Strictly honor append-only artifacts: the UI reads SiteGraph snapshots, does not recompute metrics.

Scope (MVP)
- Read-only viewer backed by SiteGraph snapshot JSON (status/evidence/sitemap/graph_runs/…/sitegraph.json).
- Lenses: Core, Hub, API, Memory, Runtime, Quarantine.
- Top‑K clamp, pinned anchors, stable layout, node details, quick-jump, search, filter toggles.
- Sigma.js 2D canvas for rendering; no server recomputation in UI.

Non‑Goals (MVP)
- No live scanning or metrics computation in the browser.
- No historical diff view; no 3D; no auto-clustering beyond simple “+N” summaries.
- No arbitrary write access; only optional append-only UI event logs via bridge.

References
- Schema: status/design/schemas/sitegraph.schema.json
- Style: status/design/sitegraph/STYLE_GUIDE.md
- Signals: status/design/sitegraph/SIGNALS.md
- Checkpoints: status/checkpoints/CKPT_72H_RUN.md (pinned)
- Rules: .rules (pinned)

1) UI Layout

High-level
- Top Bar (filters + lens + snapshot selector + search)
- Left Pane (Anchored Tree / Lenses & Filters)
- Center Canvas (Sigma 2D graph)
- Right Pane (Inspector / Node details / Badges / Evidence links)
- Bottom Bar (Status: snapshot id, lens, K, seed; error/warning toasts)

ASCII Map
[TopBar: Lens | K | Snapshot | Seed | Search | Help]
[Left: Anchors + Filters] | [Center: Sigma Canvas] | [Right: Inspector]
[Bottom: Status • snapshot_id • created_at • layout_seed • warnings]

2) Core Interactions

Selection
- Hover: soft highlight node + 1-hop edges; tooltip shows basename, roles, centrality.
- Click: select node; lock highlight; populate Inspector.
- Shift+Click: multi-select (for path comparison and neighbor union).
- Escape: clear selection.

Zoom/Pan
- Mouse wheel / trackpad; double-click focus; Home key resets to lens default.
- Keep pinned anchors within viewport on reset.

Filters
- Lens preset: Core | Hub | API | Memory | Runtime | Quarantine.
- Top‑K clamp: K.level0 (primary), optional K.level1 on zoom-in reveal.
- Toggles:
  - Show pinned anchors (always on in MVP; anchors.pinned enforced)
  - Hide low-weight edges (≤ slider threshold; default auto per lens)
  - Show only bottlenecks (scores.bottleneck.flag)
  - Show isolation islands (top quantile by isolation)

Search
- Fuzzy search over node.id; keyboard: “/” focuses search, Enter selects top match.
- Quick-jump: anchors list with hotkeys 1..9.

Inspector (Right Pane)
- Header: id (path), kind, roles, badges.
- Metrics:
  - scores: centrality, isolation, bottleneck.flag, upgrade/deprecate (if present)
  - raw/norm snapshots: in/out degree, pr, btw, evidence_count
- Metadata: owner, mtime, size, last_reviewed.
- Links:
  - “Open file” (copy path), “Reveal in tree” (scrolls left), evidence backlinks (if any).
- Badges:
  - Bottleneck: red halo; Isolation: dotted ring; Quarantine: “Q”.

Cluster Summary
- When node count > budget at current zoom, show “+N more” summary per community/hierarchy bucket.
- Click expands bucket (local-only; ephemeral; no persistence).

Keyboard Shortcuts (MVP)
- / focus search
- Enter select first search result
- a..i jump to anchors 1..9
- h/j/k/l pan (vim-style), +/- zoom, 0 reset
- b toggle bottleneck-only, i toggle isolation-only

3) Data Contract (Read Path)

Snapshot Source (append-only)
- Filesystem path: status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json (or a latest.json symlink/manifest if desired; avoid server symlink writes).
- UI expects JSON matching sitegraph.schema.json with:
  - meta: { snapshot_id, created_at, style_version, signals_version, layout_seed, lens, K, thresholds, norm_params }
  - nodes: [ { id, kind, roles, owner?, last_reviewed?, mtime?, size?, raw?, norm?, scores? } ]
  - edges: [ { src, dst, type, weight? } ]
  - anchors: { pinned: [id...], positions?: { id: {x,y}, ... } }

UI Consumption Rules
- Treat meta.layout_seed as authoritative for layout randomization; do not mutate seed.
- If anchors.positions present, fix those nodes at given positions and solve the rest (Sigma settings).
- Do not recompute metrics; use scores/norm/raw directly for visuals and ordering.
- Respect K from meta for initial label visibility and node count clamp.

Minimal Example (inline)
  meta: { snapshot_id: "20250821T090000Z", created_at: "2025-08-21T09:00:00Z", layout_seed: 12345, lens: "Core", K: {level0:8, level1:20}, ... }
  nodes: [
    { id: "gumgang_meeting/.rules", kind: "file", roles: ["C","S","D"], scores: {centrality:0.7, isolation:0.05, bottleneck:{flag:false}}, ... },
    { id: "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md", kind:"file", roles:["C","S","D"], scores:{centrality:0.66, isolation:0.03}, ... }
  ]
  edges: [ { src:"gumgang_meeting/.rules", dst:"gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md", type:"references", weight:1 } ]
  anchors: { pinned: ["gumgang_meeting/.rules","gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md"], positions: {} }

4) Optional UI Event Logging (Append-Only)

If enabled via bridge, write UI events to:
- status/evidence/ui_house_map/events/<snapshot_id>.jsonl
- Append-only; one JSON per line; no in-place edits.

Event Record (example)
  { "ts":"2025-08-21T10:45:00Z", "event":"select", "node_id":"gumgang_meeting/app/api.py", "snapshot_id":"20250821T090000Z", "lens":"Core", "filters":{"bottleneck_only":false}, "ui_version":"A1" }

Notes
- Respect PII_STRICT: do not log content, only ids/metadata.
- If filesystem write fails, degrade silently and show a one-time toast.

5) Rendering Rules (MVP)

Nodes
- Color by primary role (STYLE_GUIDE palette), lighten by path depth if desired.
- Size by scores.centrality (clamped; [6px,22px]).
- Stroke +1px for pinned anchors; halos: recency rings if mtime close to now.
- Badges:
  - Bottleneck: red outer ring (2px).
  - Isolation: dotted ring (1.5px).
  - Quarantine: red “Q” pill (role tag “Q” or path under QUARANTINE/).

Edges
- Color tinted by source role; width by log(weight) clamped [0.5px,2.0px]; opacity by confidence/recency if available; no labels.

Labels
- Show for top K.level0 by centrality at default zoom; reveal more on zoom; full id in tooltip.

Layout
- Deterministic: use meta.layout_seed; pin anchors. Keep an iteration/time budget for force layout (avoid layout thrash).
- Cache camera state per (snapshot_id, lens) during session for smoother back/forward.

6) Sigma.js Integration

Mapping
- Node.key = node.id; node.size = f(scores.centrality); node.color = roleColor(roles[0]); node.x/y from anchors.positions if present; else from force.
- Edge.key = src+"->"+dst+"#"+(idx); edge.size = f(weight), edge.color = tint(roleColor(srcRole)).

Performance
- Target ≤500 nodes, ≤2,000 edges at initial render; downsample by K and filters.
- Use requestAnimationFrame; throttle hover; precompute visual props once per load.

7) Error Handling and Integrity

Loading States
- Snapshot list empty: show guidance to generate snapshots (see BT-14 scanner).
- Schema mismatch: show red banner with pointer to schema version and failing keys.
- Missing anchors: warn, but continue; never block render.

Guards
- Never write to snapshot files; read-only.
- Treat unknown fields as inert; ignore rather than fail.
- If layout fails, fallback to circular layout keeping anchors distributed.

8) Accessibility & UX

- Dark/light themes; WCAG AA contrast; color-blind safe hues (STYLE_GUIDE).
- Motion reduced if prefers-reduced-motion; limit node jitter on layout.
- Minimum interactive hit area 24px via halos; keyboard navigability.

9) Configuration Surface (MVP)

- Lens default: Core.
- K defaults from meta; UI can override within bounds (e.g., K.level0 ∈ [5,20]).
- Thresholds from meta.thresholds; UI uses for badges and filters; no overrides in MVP.
- Layout seed from meta; UI allows re-seed for view only (does not persist).

10) Acceptance Criteria (MVP)

- Load a valid snapshot and render within 1.5s for ≤500 nodes, ≤2,000 edges on mid-tier hardware.
- Pinned anchors (.rules, CKPT_72H_RUN.md, app/api.py, memory_gate SSOT) visible or 1‑hop reachable by default.
- Deterministic layout with same seed across reloads; node positions for pinned anchors stable.
- Filters affect only visibility; metrics and ordering remain per snapshot.
- Optional event log produces append-only JSONL without errors when enabled.

11) Implementation Plan (ST-1401)

- UI Skeleton
  - TopBar, LeftPane, RightPane, BottomBar
  - SigmaCanvas component with data adapters
- Data
  - SnapshotLoader: fetch + schema validate (fast checks client-side)
  - GraphAdapter: map snapshot to Sigma nodes/edges with visuals
- Interactions
  - Hover/select, search, lens/K filters, quick-jump anchors, cluster summaries
- Integrity
  - Error banners, warnings, and read-only guarantees
  - Optional append-only event logger via bridge
- QA
  - Snapshot fixtures under status/evidence/sitemap/graph_runs/dev_sample/
  - Rendering tests: anchors present; labels LOD; filters toggle correctness

12) Risks & Mitigations

- Large snapshots → hairball: mitigate via lens + Top‑K + cluster summaries.
- Schema drift: include schema version in UI; soft-fail with clear messaging.
- Layout instability: pin anchors + fixed seed + iteration cap.
- Write incidents: keep UI read-only by default; event logging behind explicit toggle.

13) Future (Post-MVP)

- Snapshot diff view (temporal deltas); churn heatmaps.
- Advanced clustering/community detection; pop-out panels.
- “Why” panel for bottlenecks and isolation guidance.
- Server-side subgraph queries; pagination for large components.
- Export images/CSV of current subgraph with evidence bundle.

Change Log
- v1 (BT-14 ST-1401): Initial A1 House Map MVP design with UI layout, interactions, and data contract.