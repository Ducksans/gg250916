---
phase: past
---

# BT-13 Briefing for Web Gumgang (read-only)

Purpose
- Share the full context, decisions, artifacts, and design proposals from BT-13 so Web Gumgang can review, ideate, and help refine the “Semantic Structure Viewer (SSV)” direction for Gumgang UI.
- This briefing is documentation only. No code or behavior changes are requested in BT‑13.

TL;DR
- We produced three core evidence docs: Self‑Structure Report v0, Improvement Cards v0, and a one‑page Sitemap v0 that clarifies static vs dynamic assets and their connections.
- We propose an Obsidian‑inspired Semantic Structure Viewer (SSV) integrated into the UI, with role‑based coloring, centrality scoring, 2D/3D views, and decision helpers (bottlenecks, isolation, upgrade/deprecate suggestions). Implementation is BT‑14+.
- Ask: Review the proposals, challenge the model/UX, and suggest a pragmatic MVP plan for Web integration.

Context and Constraints
- Project scope and rules: gumgang_meeting/.rules
  - WRITE_ALLOW: gumgang_meeting/**
  - APPEND_ONLY: status/checkpoints/*.md
  - Ports: Backend 8000 (uvicorn app.api:app), Bridge 3037
  - IMPORT_ENABLED=false, PII_STRICT=true
- SSOT checkpoints: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md (append‑only)
- Backend surface: gumgang_meeting/app/api.py
  - Meetings: /api/meetings/*
  - Memory: /api/memory/{store,search,recall}
  - Gate: /api/memory/gate/{propose,patch,withdraw,approve,reject,list,item,stats}
  - Anchor: /api/memory/anchor

What BT‑13 Produced (Evidence)
1) Self‑Structure Report v0
   - Path: gumgang_meeting/status/evidence/structure_report_BT-13_v0.md
   - Content: Repo overview, hotspots (e.g., CKPT growth), gaps (e.g., evidence map), bottlenecks, and deferral cards
   - Notable notes: CORS hardening to move from permissive dev defaults; explicit PII patterns path
2) Improvement Proposal Cards v0
   - Path: gumgang_meeting/status/evidence/improvement_cards/BT-13_cards_v0.md
   - Policy-first; execution deferred
   - Highlights:
     - CARD-01 Memory Evidence README (hub; unify search_runs vs search lifecycle, retention)
     - CARD-02 Checkpoint rollover/caching spec
     - CARD-05 Gate API examples/spec sync
     - CARD-06 DUP/PII test set plan
     - CARD-08 CORS hardening via ENV matrix
     - CARD-14 Gate audit retention/rollover policy
3) Sitemap v0 (Static vs Dynamic)
   - Path: gumgang_meeting/status/evidence/sitemap/BT-13_sitemap_v0.md
   - One-page house map: Core/Hub/Static/Dynamic/API anchors + backlink-style notes
   - Navigation tips: Prefer “stable anchors” (paths/endpoints) over line ranges

Key Decisions (BT‑13)
- No execution; documentation/evidence only
- Adopt “stable anchors” (paths/endpoints) to prevent line-number drift
- Clarify PII resources path and Gate docs presence (need example enrichment/sync)
- Acknowledge CORS defaults as dev-friendly; plan hardening guide via ENV (prod forbids “*”)
- Checkpoints remain append-only; BT‑13 entries appended near file end

Problem to Solve Next
- As files, evidence, and logs grow, discovery and onboarding cost increases
- We need a first-class, Obsidian-like visualization that shows:
  - Core anchors (rules, checkpoints, APIs)
  - Hubs/indices (evidence maps, design)
  - Dynamic evidence (memory/meetings/ui logs)
  - Connections (refs/backlinks/evidence-of)
  - Bottlenecks and isolated nodes
  - One-click jump to file/doc/code/API

Semantic Structure Viewer (SSV) — Proposed Model (Design Only)
- Node fields
  - path, kind(file/dir/api/doc/evidence), role tags [C=core, H=hub, S=static, D=dynamic, A=api, Q=quarantine, X=external, R=runtime-log, M=memory-tier]
  - owner, last_reviewed, size, mtime
  - metrics: centrality, isolation, usage(views/edits/anchors/search hits), churn
- Edge fields
  - type: references | backlink | evidenceOf
  - weight: frequency/strength
- Scoring
  - centrality = α·in_deg + β·evidence + γ·recency + δ·role_weight(C/H boost)
  - isolation = f(degree, co-tags, path proximity, co-occurrence)
- Visual encoding
  - color=role, size=centrality, edge-width=weight, opacity=recency, dotted=inferred link
  - bottleneck badge: high in-degree with stale recency or no owner
  - isolation layer: islands with 3 suggested link targets
- Interaction
  - 2D canvas + 3D WebGL toggle; time slider(7/30/90d); lenses(Static/Dynamic/API/Mem tier)
  - Graph↔Tree↔Cards sync; double-click to open path in editor/reader
- Data pipeline (read-only snapshots)
  - FS scan + markdown link parse + evidence refs(path#Lx‑y)
  - Write snapshots to status/evidence/sitemap/graph_runs/YYYYMMDD/*.json (append-only)
- UI integration targets (proposed)
  - A1 “House Map” tab exposing Tree/Graph/Cards with stable layout seeds

Success Criteria (BT‑13)
- Above three BT‑13 evidence docs exist and cross-link
- Proposals capture 2D/3D, clustering, bottleneck/isolation, decision helpers, and one-click navigation concepts
- No code/config changes performed in BT‑13

BT‑14 (Preview; needs approval)
- Backend scanner to generate SiteGraph snapshots (JSON) on demand/manual
- A1 UI: Tree + Cards MVP with jump-to-file/endpoint
- Optional: 2D graph with top‑K central nodes and safe cluster pop-outs

Risk/Guardrails
- Drift: keep .rules, CKPT_72H_RUN.md, app/api.py, memory_gate SSOT as fixed 1‑hop anchors
- Noise: top‑K clamping per zoom, cluster summary nodes (+N more)
- Consistency: fixed palette/icons per role; deterministic layout for same seed/filter
- Safety: append-only evidence; prod CORS avoids “*”; PII_STRICT

Open Questions for Web Gumgang
1) Graph engine
   - 2D: d3-force, force-graph, cytoscape.js?
   - 3D: three.js, regl-based force graph? Any prior components you prefer?
2) Layout stability
   - Strategies to reduce “layout bounce” across sessions; seeded randomness; anchor cores
3) Performance
   - Incremental graph loading; LOD (level-of-detail) nodes/edges; WebWorkers
4) Interaction design
   - Best affordances for cluster pop-out, lens toggles, and quick jump
5) Decision helpers
   - What UI patterns for bottleneck banners, isolation suggestions, upgrade/deprecate cards?
6) Evidence UX
   - How to surface “why this is a bottleneck/island” with 1-click evidence previews?

Quick Links (Evidence and Anchors)
- Rules (core): gumgang_meeting/.rules
- Checkpoints (core): gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
- Backend API (core): gumgang_meeting/app/api.py
- Self-Structure v0: gumgang_meeting/status/evidence/structure_report_BT-13_v0.md
- Improvement Cards v0: gumgang_meeting/status/evidence/improvement_cards/BT-13_cards_v0.md
- Sitemap v0: gumgang_meeting/status/evidence/sitemap/BT-13_sitemap_v0.md
- PII patterns: gumgang_meeting/status/resources/memory/pii/patterns_v1.json
- Gate design docs: gumgang_meeting/status/design/memory_gate/{API.yaml,DECISIONS.md,SSOT.md}

How to Respond (Web Gumgang)
- Add comments/ideas on:
  - MVP scope for A1 “House Map” (Tree + Cards + quick jump)
  - Graph engine tradeoffs (rendering, zoom, labels)
  - Centrality/isolation signal definitions and thresholds
  - Interaction patterns for cluster pop-out and bottleneck/isolation panels
- Identify risks we missed and low‑effort wins for v0.1

Status
- BT‑13 documentation complete (read‑only). Awaiting Web Gumgang feedback to finalize BT‑14 MVP plan.
