# SiteGraph Signals (v1)

Purpose
- Define measurable signals, score formulas, thresholds, and a server-side computation pipeline for the Semantic Structure Viewer (SSV).
- Ensure results are stable, explainable, and reproducible across snapshots.
- Scope: documentation (v1 skeleton). Implementation in BT-14.

1) Terminology
- Node: file/dir/api/doc/evidence/etc.
- Edge: references | backlink | evidenceOf
- Snapshot: a single computed graph state (append-only artifact).
- Lens: filter preset that restricts graph to a subgraph (Core/Hub/API/Memory/Runtime/Quarantine).

2) Raw Signals (per node)
- in_degree: number of incoming edges
- out_degree: number of outgoing edges
- degree: in_degree + out_degree
- evidence_count: count of evidence refs (e.g., status/evidence/*) pointing to this node
- recency: time-decayed freshness ∈ [0,1]; e.g., 1/(1+age_days/halflife_days)
- usage_count: UI usage signals (views/edits/anchors/search hits), if available; else 0
- owner_present: boolean (1 if owner/steward assigned, else 0)
- tags: role tags (C,H,S,D,A,Q,X,R,M), used for role weighting and distance heuristics
- path_distance_to_core: normalized distance in path hierarchy to nearest core anchor
- pr: PageRank (quality of references)
- btw: Betweenness centrality (bridge/bottleneck indicator)
- eig: (optional) Eigenvector centrality

3) Derived Signals
- isolation_features:
  - low_degree = 1 if degree ≤ 1 else 0
  - no_recent_usage = 1 if usage_count == 0 and recency ≤ τ_recent else 0
  - role_gap = normalized distance to nearest node with overlapping role tags
- bottleneck_features:
  - high_betweenness = quantile_rank(btw) ≥ 0.90
  - stale = recency ≤ τ_stale
  - no_owner = 1 - owner_present

4) Normalization
- Min–max to [0,1] for non-negative metrics (degree/evidence_count/usage_count/pr/btw/eig).
- Recency is already [0,1] by construction.
- Quantiles: compute empirical CDF to get quantile ranks (for thresholding).
- Clamp after normalization to avoid outliers dominating: clamp(x, 0.0, 1.0).
- Note: keep raw_values in payload for audit; store norm_params per snapshot.

5) Default Score Formulas (v1)
- centrality ∈ [0,1]
  centrality = 0.40*norm(in_degree) + 0.20*norm(pr) + 0.20*recency + 0.20*norm(evidence_count)
  then apply role_weight multiplier: centrality *= role_boost(role)
  where role_boost(C)=1.15, H=1.10, A=1.05, others=1.00 (tunable)

- isolation ∈ [0,1] (higher = more isolated)
  isolation = norm( w1*low_degree + w2*no_recent_usage + w3*role_gap )
  defaults: w1=0.5, w2=0.3, w3=0.2

- bottleneck_flag (boolean) and bottleneck_explainer
  bottleneck_flag = (quantile_rank(btw) ≥ 0.90) AND (recency ≤ τ_stale OR owner_present==0)
  bottleneck_explainer = { btw_q, recency, owner_present, evidence_count, in_degree }

- upgrade_score (promotion candidate; optional)
  upgrade_score = 0.5*centrality + 0.3*norm(usage_count) + 0.2*norm(in_degree)
  justification: highly used but deep in hierarchy → propose hub/pin

- deprecate_score (retire candidate; optional)
  deprecate_score = 0.6*isolation + 0.4*(1 - recency)

6) Thresholds and Clamping
- Top-K (initial render): level0=8 nodes, level1=20 nodes (expand on zoom)
- Bottleneck: p90 betweenness; τ_stale defaults = 0.25 recency (configurable)
- Isolation: top p10 isolation qualifies for “island” layer
- Label LOD: show labels for top K by centrality at each zoom bucket
- Edge width clamp: map weight to [0.5px, 2.0px] (log scale)
- Node size clamp: [6px, 22px] at level 0

7) Lenses (Subgraph Presets)
- Core: always include .rules, CKPT_72H_RUN.md, app/api.py, memory_gate SSOT and their 1-hop neighbors
- Hub: nodes with role∈{C,H} or in_degree quantile ≥ p80
- API: nodes tagged A and their 1-hop neighbors
- Memory: nodes/evidence under status/evidence/memory/* + upstream designers/specs
- Runtime: logs/evidence under status/evidence/ui_* and tools_probe/*
- Quarantine: QUARANTINE/* (read-only; highlight with caution)

8) Server-Side Computation Pipeline (per snapshot)
1) Scan
   - Walk FS (WRITE_ALLOW scope)
   - Parse Markdown links ([text](path)) and evidence refs (path#Lx-y)
   - Build nodes {path, kind, role tags} and edges {src, dst, type, weight}
   - Ingest metadata: mtime, size, owner (if available), last_reviewed (if any)
2) Compute metrics (NetworkX or equivalent)
   - degree, in_degree, out_degree
   - PageRank(pr) (damping=0.85, max_iter bounded)
   - Betweenness(btw) (approximate on sampled nodes if large)
   - (optional) Eigenvector centrality
3) Recency/Usage
   - recency = 1/(1 + age_days/halflife_days), default halflife_days=7
   - usage_count from UI evidence logs when available; otherwise 0
4) Normalize
   - Compute min–max per metric; store norm_params in snapshot meta
   - Quantile ranks for betweenness and isolation cutoff
5) Score
   - centrality, isolation, bottleneck_flag (+ explainer), upgrade/deprecate (optional)
6) Persist (append-only)
   - status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json
   - Include metadata: snapshot_id, created_at, style_version, signals_version, layout_seed, lens, K, thresholds, norm_params

9) Snapshot JSON Outline (v1)
{
  "meta": {
    "snapshot_id": "20250821T090000Z",
    "created_at": "ISO8601Z",
    "style_version": "1",
    "signals_version": "1",
    "layout_seed": 12345,
    "lens": "Core|Hub|API|Memory|Runtime|Quarantine",
    "K": { "level0": 8, "level1": 20 },
    "thresholds": { "bottleneck_q": 0.9, "isolation_q": 0.9, "tau_stale": 0.25, "halflife_days": 7 },
    "norm_params": { "in_degree": {"min":0,"max":…}, "pr": {...}, "btw": {...}, "evidence_count": {...} }
  },
  "nodes": [
    {
      "id": "gumgang_meeting/app/api.py",
      "kind": "file|dir|api|doc|evidence",
      "roles": ["A","C"],                 // tags
      "owner": "optional@id",
      "mtime": "ISO8601Z",
      "size": 12345,
      "raw": { "in_degree": 42, "out_degree": 7, "evidence_count": 9, "pr": 0.00032, "btw": 0.012, "usage_count": 31 },
      "norm": { "in_degree": 0.84, "evidence_count": 0.6, "pr": 0.52, "btw": 0.91 },
      "scores": {
        "centrality": 0.78,
        "isolation": 0.05,
        "bottleneck": { "flag": true, "why": { "btw_q": 0.93, "recency": 0.21, "owner_present": false } },
        "upgrade_score": 0.73,
        "deprecate_score": 0.09
      }
    }
  ],
  "edges": [
    { "src": "status/design/memory_gate/SSOT.md", "dst": "app/api.py", "type": "references", "weight": 3 }
  ],
  "anchors": {
    "pinned": [
      "gumgang_meeting/.rules",
      "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md",
      "gumgang_meeting/app/api.py",
      "gumgang_meeting/status/design/memory_gate/SSOT.md"
    ],
    "positions": { "gumgang_meeting/.rules": {"x":-0.8,"y":0.6}, ... } // optional layout hints
  }
}

10) Reproducibility and Stability
- Deterministic seeds: same seed/filter → same layout ordering.
- Store norm_params and thresholds with snapshot; never recompute in UI.
- Cache subgraph layouts keyed by (lens, filter, zoom_bucket).

11) Performance Budget (MVP)
- Initial render target: ≤ 500 nodes, ≤ 2,000 edges
- Compute caps: PageRank within N iter; Betweenness: use k-sample approx for large graphs
- Offload metrics to worker or precompute server-side

12) Safety and Compliance
- Evidence is append-only; snapshots do not embed sensitive content, only paths/metadata.
- PII_STRICT: if any node is flagged, show shield icon only; redact content at source.
- Prod CORS forbids “*”; follow ENV matrix per security guide.

13) QA and Integrity Checks
- Sanity: counts match (sum degrees = 2|E|), anchors present, roles known
- Drift: compare top-K central nodes vs previous snapshot; alert on sudden swings
- Broken links: validate referenced paths exist; list orphans/islands report
- Metrics audit: record version of algorithms and parameters

14) Roadmap (post v1)
- Add temporal deltas (diff snapshots) for churn heatmaps
- Extend usage signals (A/B: search hits, open-in-editor events)
- Advanced clustering and community detection for auto pop-outs
- Confidence intervals for scores based on data sparsity

Change Log
- v1 (BT-13): Initial skeleton with metrics, normalization, score formulas, thresholds, and server pipeline.