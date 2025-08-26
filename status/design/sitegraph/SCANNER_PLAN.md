# SiteGraph Scanner Plan (v1)

Purpose
- Produce append-only SiteGraph snapshots for A1 House Map.
- Scope: design-only for BT-14 ST-1401. No execution in this document.

Inputs
- Repo root: gumgang_meeting/**
- Exclude: DENY_GLOBS and QUARANTINE/* (read-only visualization ok)
- Schema: status/design/schemas/sitegraph.schema.json
- Rules/anchors: .rules, status/checkpoints/CKPT_72H_RUN.md, app/api.py, status/design/memory_gate/SSOT.md

Outputs (append-only)
- Snapshot JSON: status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json
- Run log: status/evidence/sitemap/graph_runs/YYYYMMDD/_run.log
- Validation report: status/evidence/sitemap/graph_runs/YYYYMMDD/_validation.md
- Latest pointer (optional): status/evidence/sitemap/latest.json

Pipeline (single run)
1) Scan: walk WRITE_ALLOW; collect files/dirs meta (mtime, size).
2) Parse: extract links and evidence refs; normalize paths.
3) Build graph: nodes (id/kind/roles), edges (src/dst/type/weight).
4) Metrics: degree, in/out, PageRank(d=0.85), Betweenness(approx), recency, usage_count(0 if none).
5) Normalize: min–max to [0,1]; record norm_params; compute quantiles.
6) Score: centrality, isolation, bottleneck_flag(+explainer) per SIGNALS v1.
7) Persist: write JSON, logs; validate against schema; integrity checks.

Parsing rules
- Markdown links: [text](path) → references edge to normalized repo-relative path.
- Evidence refs: path#Lx-y → evidenceOf edge to path.
- Backlinks: when file A references B, add backlink (B→A) or mark separately if needed for UI.
- Path normalization: POSIX, collapse .. and . ; reject absolute paths outside root.
- Node kind: file|dir|doc|api|evidence|resource|unknown via path heuristics.
- Role tags:
  - C: .rules, status/checkpoints/**
  - S/D: status/design/**, status/**
  - A: app/** api files, OpenAPI
  - UI: ui/**, 금강ui/**
  - Q: QUARANTINE/**
  - M: memory/**
  - H: hub/core utilities (scripts/**, bridge/**)
  - X/R: external/resource as needed
- Edge weight: count repeated occurrences.

Metrics details
- PageRank: damping 0.85, tol 1e-6, max_iter bounded.
- Betweenness: k-sample approx with k=min(100, N/5).
- Recency: 1/(1+age_days/halflife_days), halflife_days=7.
- Normalization: store per-metric min/max in meta.norm_params.
- Scores (defaults): per status/design/sitegraph/SIGNALS.md.

Determinism & lenses
- layout_seed fixed per run; store in meta.
- Lenses: Core, Hub, API, Memory, Runtime, Quarantine.
- Top-K defaults: K.level0=8, K.level1=20.
- Anchors pinned (always 1-hop visible):
  - gumgang_meeting/.rules
  - gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
  - gumgang_meeting/app/api.py
  - gumgang_meeting/status/design/memory_gate/SSOT.md

Validation & integrity
- JSON Schema validate with sitegraph.schema.json.
- Sanity: |V|>0, |E|>=0, sum(deg)=2|E| (undirected view), anchors exist.
- Broken links/orphans report; list unknown roles/kinds.
- Append-only write; never edit prior snapshots.

CLI (planned)
- sitegraph-scan --root gumgang_meeting --lens Core --seed 12345 --k0 8 --k1 20 --date YYYYMMDD --out status/evidence/sitemap/graph_runs/YYYYMMDD --dry-run
- Exit codes: 0 ok, 2 schema fail, 3 integrity fail.

Performance budget (MVP)
- Initial subgraph ≤ 500 nodes, ≤ 2,000 edges; total walk may exceed but clamp for lens/K.

Security & policy
- PII_STRICT: redact content; snapshot stores paths/meta only.
- IMPORT_ENABLED=false respected; no external fetch.
- QUARANTINE read-only; mark with Q role/badge.

Milestones (ST-1401)
- M1: FS walker + meta capture
- M2: Markdown/evidence parser
- M3: Graph build + NX metrics
- M4: Normalize + score + schema validate
- M5: Core lens snapshot + validation report
- M6: Wire to A1 House Map MVP (Sigma.js reads snapshot)

Risks & mitigations
- Large graphs: lens+K clamp, betweenness approx.
- Path mis-normalization: strict resolver + tests.
- Clock drift: use UTC; monotonically increasing snapshot_id.

Change log
- v1: Initial skeleton for scanner pipeline, parsing, metrics, outputs.