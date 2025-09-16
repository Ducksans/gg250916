---
phase: past
---

# SiteGraph Ops Notes v0

Purpose
- Define operational practices for the Semantic Structure Viewer (SSV) pipeline and runtime.
- Cover snapshot generation, caching, performance budgets, layout stability, safety/compliance, SLOs, and observability.
- Scope: documentation only (BT-13). Implementation follows in BT-14.

1) Inputs → Outputs (Snapshot Artifact)
- Inputs (read-only):
  - FS walk within WRITE_ALLOW: gumgang_meeting/**
  - Markdown links: [text](path)
  - Evidence refs: path#Lx-y (e.g., status/evidence/memory/…)
  - Metadata: mtime, size, (optional) owner/steward, last_reviewed
- Outputs (append-only):
  - status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json
- Snapshot meta (required fields):
  - snapshot_id (ISO8601Z), created_at, style_version, signals_version
  - layout_seed (deterministic), lens, K {level0, level1}, thresholds {bottleneck_q, isolation_q, tau_stale, halflife_days}
  - norm_params per metric (min, max), algorithms/version

2) Server-side Compute (pre-UI)
- Build node/edge graph:
  - Node: {id=path, kind=file|dir|api|doc|evidence, roles=[C/H/S/D/A/Q/X/R/M], mtime, size, owner?}
  - Edge: {src, dst, type=references|backlink|evidenceOf, weight}
- Metrics:
  - degree/in_degree/out_degree
  - PageRank(pr) (d=0.85, max_iter bounded)
  - Betweenness(btw) (approx; sample if big)
  - Recency: 1 / (1 + age_days/halflife_days), halflife_days=7 (default)
  - usage_count (if UI logs available; else 0)
- Normalize/Score (see SIGNALS.md):
  - min–max to [0,1], quantile ranks for thresholds
  - centrality, isolation, bottleneck_flag (+ explainer)
- Persist snapshot (append-only) with meta and integrity notes.

3) Caching Strategy
- Snapshot cache:
  - Key: snapshot_id
  - TTL: N/A (immutable); cleanup by retention policy
- Layout cache (client/runtime):
  - Key: (snapshot_id, lens, filter_hash, zoom_bucket, layout_seed)
  - Stores: node positions, cluster pop-outs, pin locations
- Data cache:
  - Pre-filtered subgraphs for frequent lenses (Core/Hub/API/Memory/Runtime/Quarantine)

4) Layout Policy
- Pinned anchors (fixed positions, stored in snapshot.hints):
  - gumgang_meeting/.rules
  - gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
  - gumgang_meeting/app/api.py
  - gumgang_meeting/status/design/memory_gate/SSOT.md
- Determinism:
  - Fixed layout_seed per (snapshot_id, lens)
  - Force iterations capped; same input → same ordering
- Subgraph-first:
  - Always render a filtered subgraph with Top‑K clamp (never full hairball)
- DAG view:
  - Use ELK layered for “규칙→체크포인트→API→Evidence” flow
  - Do not mix with force layout in the same canvas
- Fallback:
  - If layout budget exceeded, switch to Tree/Cards list automatically and notify

5) Performance Guardrails (MVP)
- Initial render target (with cache hit):
  - TTI < 1.0s, nodes ≤ 500, edges ≤ 2,000
- Interaction:
  - 60 FPS aim, 30 FPS minimum under dense clusters
  - LOD labels: show top-K by centrality; reveal on zoom/hover
- Workers:
  - Offload parsing/layout to WebWorker when available
- Server limits:
  - PageRank bounded iter (e.g., ≤ 100)
  - Betweenness approximate (k-sample; cap total time)
- Batching:
  - Debounce snapshot writes; coalesce within 2–5s windows during manual runs

6) Safety & Compliance
- Append-only:
  - Evidence and snapshots never edited in place
- PII_STRICT:
  - Snapshots include paths/metadata only; no sensitive payloads
  - If any node flagged (from upstream scans), show shield icon; redaction occurs at source evidence
- Quarantine:
  - QUARANTINE/* nodes visible read-only; red badge; no expansion into quarantined contents
- CORS/ENV:
  - Prod forbids “*”; follow ENV matrix; DEV may be permissive
- Access:
  - UI jump-to-file restricted to WRITE_ALLOW; deny-in-deny-globs
- Integrity:
  - Record algorithms, params, thresholds in snapshot.meta for reproducibility

7) Retention & Rotation
- Snapshots:
  - Keep last N days (e.g., 30) by default; archive older or summarize into weekly aggregates
- Layout caches:
  - LRU with size cap; invalidate when style_version or layout_seed changes
- Audit:
  - Keep a daily index file listing snapshot_ids and key metrics (counts, top-K)

8) Observability (Logs, Metrics, Alerts)
- Logs:
  - snapshot_create_start/finish, durations, node/edge counts, errors
  - layout_cache_hit/miss, filter parameters
- Metrics (per snapshot and per lens):
  - nodes_rendered, edges_rendered, tti_ms, fps_min/max/avg, orphan_rate, broken_link_count
  - hairball_risk_score = nodes_shown / nodes_total (alert if > threshold without filter)
- Alerts:
  - Snapshot failure, metrics compute timeout, orphan_rate spike, broken_link_count > 0
  - Drift alert: top‑K centrality set changes > 40% between adjacent snapshots

9) SLOs (Draft)
- Availability: 99% for reading latest snapshot within UI
- Latency:
  - Cached initial render < 1.0s (p95)
  - Uncached initial render < 2.5s (p95)
- Interactivity:
  - Pan/zoom ≥ 30 FPS (p95) for nodes≤500/edges≤2,000
- Accuracy:
  - Metrics completeness (PR/Betweenness) computed within configured caps; expose flags when approximated
- Error budget:
  - ≤ 1% of sessions with broken links or missing anchors

10) Ops Procedures
- Manual snapshot:
  - CLI/endpoint to trigger scan→compute→persist (write under graph_runs/YYYYMMDD/)
  - Validate anchors present; run integrity checks; write index update
- Failure handling:
  - Exponential backoff; fall back to previous snapshot; raise alert
- Rollback:
  - UI reads last known-good snapshot on current day; operator can pin a snapshot_id
- Drift check:
  - Compare top‑K central nodes with previous; log delta and highlight in UI
- Broken links:
  - Produce a report listing missing paths; link to probable fixes (owner, nearest hub)

11) Security Notes
- Do not embed API tokens or secrets in snapshots
- Respect DENY_GLOBS and QUARANTINE boundaries
- Sanitize any user-provided paths before linking/jumping

12) Change Management
- Versioning:
  - style_version, signals_version increment when visual or scoring rules change
- Migration:
  - Provide compatibility shims in UI for N-1 versions
- Runbook:
  - Common incidents: cache stampede, layout bounce, large lens cost
  - Remedies: seed/pin reuse, clamp K, force DAG fallback, increase worker pool

13) Open Questions (to be resolved in BT-14)
- Usage signals source (UI logs format) and privacy policy
- Owner/steward data source of truth
- Exact thresholds tuning (bottleneck/isolation) by empirical data
- How many lenses to pre-cache per snapshot

Appendix — Quick Reference
- Anchors: .rules, status/checkpoints/CKPT_72H_RUN.md, app/api.py, status/design/memory_gate/SSOT.md
- Palettes & styles: status/design/sitegraph/STYLE_GUIDE.md
- Signals & formulas: status/design/sitegraph/SIGNALS.md
- Snapshot location: status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json