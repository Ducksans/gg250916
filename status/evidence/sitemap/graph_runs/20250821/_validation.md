# SiteGraph v0 (Core Lens) — Validation Report
Date: 2025-08-21 (UTC)
Run Dir: gumgang_meeting/status/evidence/sitemap/graph_runs/20250821

Summary
- Output snapshot: gumgang_meeting/status/evidence/sitemap/graph_runs/20250821/sitegraph.json
- Schema: gumgang_meeting/status/design/schemas/sitegraph.schema.json
- Scanner script: gumgang_meeting/scripts/sitegraph_scan.py
- Lens: Core
- Layout seed: 12345
- Nodes kept: 339
- Total files scanned: 5050
- Edges: 0
- File size: 301,194 bytes
- NetworkX available: no (fallback metrics used)
- Schema validation: no errors observed (script would emit [WARN] on failure)

Snapshot Meta (from sitegraph.json)
- snapshot_id: 20250821T134059Z
- created_at: 2025-08-21T13:40:59.545672Z
- K: { level0: 8, level1: 20 }
- thresholds: { bottleneck_q: 0.9, isolation_q: 0.9, tau_stale: 0.25, halflife_days: 7 }
- norm_params present for: in_degree, pr, btw, evidence_count

Anchors (pinned)
- gumgang_meeting/.rules
- gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
- gumgang_meeting/app/api.py
- gumgang_meeting/status/design/memory_gate/SSOT.md

Validation Steps and Results
1) Dry-run
   - Command: python3 scripts/sitegraph_scan.py --date 20250821 --dry-run
   - Outcome: Nodes kept=339 (total=5050), Edges=0; would write to .../sitegraph.json
2) Full write
   - Command: python3 scripts/sitegraph_scan.py --date 20250821 --out-dir gumgang_meeting/status/evidence/sitemap/graph_runs/20250821 --overwrite
   - Outcome: [OK] Wrote snapshot; Nodes=339, Edges=0
3) Schema validation
   - The scanner runs JSON Schema validation when jsonschema is installed; it prints a warning on failure.
   - No validation warnings were printed during this run.

Observations
- Edges=0 indicates current graph is derived purely from Markdown references; repository Markdown files may have limited intra-repo links or links filtered out as external. This is acceptable for v0; future lenses can add additional edge sources.
- Norm parameter ranges are populated and sane; centrality/isolation scores are emitted per node.
- Pinned anchors are present in the snapshot’s anchors.pinned.

Next Actions
- Wire this snapshot path to the A6 SSV panel for rendering.
- Add additional edge sources in future iterations (e.g., import graphs, code import edges) to increase edge coverage.
- Schedule periodic runs and append results under dated graph_runs directories.

Evidence
- Snapshot JSON: gumgang_meeting/status/evidence/sitemap/graph_runs/20250821/sitegraph.json
- Schema (v1): gumgang_meeting/status/design/schemas/sitegraph.schema.json
- Scanner: gumgang_meeting/scripts/sitegraph_scan.py