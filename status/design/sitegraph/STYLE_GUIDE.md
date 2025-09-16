---
phase: past
---

# SiteGraph Style Guide (v1)

Purpose
- Define consistent, legible, and accessible visual rules for the Semantic Structure Viewer (SSV).
- Prioritize subgraph-first readability, stable layout, and quick decision cues.
- Scope: documentation only; implementation follows in BT-14.

Principles
- Evidence-first. Only render what matters now (lens + Top‑K), never the entire hairball.
- Stable anchors. Same filter/seed → same layout. Core anchors are pinned.
- Accessibility. WCAG AA contrast; color is never the only signal.

Role Taxonomy and Colors (Core → Lighter Descendants)
- Memory: Blue 800 #1E40AF → 600 #2563EB → 400 #60A5FA → 300 #93C5FD
- Gate: Violet 700 #6D28D9 → 500 #8B5CF6 → 300 #C4B5FD
- API: Teal 700 #0F766E → 500 #14B8A6 → 300 #5EEAD4
- Checkpoints: Amber 700 #B45309 → 500 #F59E0B → 300 #FCD34D
- Rules: Slate 800 #1F2937 → 600 #475569 → 400 #94A3B8
- UI: Indigo 700 #4338CA → 500 #6366F1 → 300 #A5B4FC
- Evidence (dynamic): Neutral Gray (activity↑ → #9CA3AF → #6B7280 → #374151)
- Runtime Log: Zinc 500 #71717A (muted), highlight by recency ring
- Quarantine: Red badge (Rose 600 #E11D48, 500 #F43F5E)
- External/Unknown: Stone 400 #A8A29E

Node Styling
- Fill: role base color; descendants decrease saturation/brightness by depth.
- Size: proportional to centrality (clamped; min 6px, max 22px at level 0).
- Stroke: 1–2px; pinned anchors +1px stroke emphasis.
- Halo/Ring:
  - Recency highlight: subtle outer glow if updated in last 7/30/90 days (strong/medium/weak).
  - Bottleneck badge: red outer ring (2px).
  - Isolation: dotted outer ring (1.5px).

Edge Styling
- Color: lightly tinted from source node role; avoid dark-on-dark.
- Width: 0.5–2px mapped to weight/frequency (log scale clamp).
- Opacity: 0.25–0.9 by confidence/recency.
- Dashed: inferred/weak links (never for direct references).
- Direction: arrowheads optional; keep minimal at scale (prefer undirected visuals unless DAG mode).

Labels and LOD (Level of Detail)
- Default zoom: show labels for top K nodes by centrality (e.g., K=20); others on hover.
- Zoom in: progressively reveal more labels; hide edge labels by default.
- Font: UI system font, 11–13px; maintain AA contrast against background.
- Truncation: ellipsis > 24 chars; full name in tooltip.

Layout Stability
- Pinned anchors (fixed positions stored in snapshot):
  - .rules, status/checkpoints/CKPT_72H_RUN.md, app/api.py, status/design/memory_gate/SSOT.md
- Deterministic force: fixed seed per (filter, snapshot_id); consistent iteration budget.
- Subgraph cache: store layout for each (lens, filter, zoom bucket); reuse if unchanged.
- DAG view (ELK layered): use for pipeline/flow diagrams; never mix with force in same canvas.

Lenses and Filters (Subgraph-First)
- Presets: Core, Hub, API, Memory, Runtime, Quarantine.
- Always combine a lens with Top‑K clamp for initial render.
- Cluster pop-out: “+N more” summary node; expand on click/zoom.

Badges and Icons
- Bottleneck: red ring + “!” corner badge; tooltip explains criteria (betweenness↑, recency↓/owner missing).
- Isolation: dotted ring; tooltip suggests 3 nearest hubs for linkage.
- Quarantine: red pill badge “Q”.
- PII flag: small shield icon on node if content flagged in evidence (no sensitive detail shown).

Accessibility
- Contrast: node/label/edge meet AA on dark/light themes; test with color-blind simulators.
- Non-color cues: ring styles, dashes, icons complement color cues.
- Hit targets: ≥ 24px interactive area (halo expansion) for selection on dense clusters.
- Motion: reduce animation on “prefers-reduced-motion”.

Do and Don’t
- Do
  - Render a filtered subgraph with Top‑K and LOD labels.
  - Keep core anchors visible within 1‑hop by default.
  - Use consistent palette per role across all views.
- Don’t
  - Render the entire graph without filters (hairball).
  - Use rainbow palettes or per-node arbitrary colors.
  - Overprint labels or arrowheads at scale.

Style Tokens (for implementation)
- node.fill.role.memory.depth{0..3} = [#1E40AF, #2563EB, #60A5FA, #93C5FD]
- node.stroke.pinned = +1px
- node.halo.recency = {7d: strong, 30d: medium, 90d: weak}
- edge.width = mapWeight(w, clamp=[0.5,2.0])
- edge.opacity = mapConfidence(c, clamp=[0.25,0.9])
- ring.bottleneck = red 2px; ring.isolation = dotted 1.5px
- label.font = 12px; label.maxLen = 24; label.tooltip = full path

Theming
- Provide dark and light themes with same hues; adjust luminance for AA.
- Expose CSS variables for role colors and ring/badge styles.

Versioning and Metadata
- Include style_version, palette_version, and layout_seed in snapshot metadata.
- Record (lens, filter, K, thresholds) alongside rendered evidence.

References
- Signals/thresholds: see SiteGraph Signals (v1).
- Ops/runtime policy: see SiteGraph Ops Notes v0.

Change Log
- v1 (BT-13): Initial skeleton with palette, edges, LOD, stability, badges, prohibitions.