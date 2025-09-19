---
phase: past
---

# BT-13 Improvement Proposal Cards v0 (read‑only; execution deferred)

This file proposes small, actionable improvements discovered during BT‑13 ST‑1301 self‑structure review. Do not execute any change now. All items are documentation/planning only and point to Evidence paths for context.

Policy
- Execution is prohibited until BT‑14. IMPORT_ENABLED=false per BT‑11; PII_STRICT=true.
- Evidence-first: cite concrete paths; prefer stable anchors (endpoint names/paths) over line ranges.

Legend
- Priority: P1 (high), P2 (medium), P3 (low)
- Effort: S (≤1h), M (≤1d), L (>1d)
- Status: Deferred (no execution in BT‑13)

References
- Rules: gumgang_meeting/.rules
- SSOT Checkpoint: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
- Backend: gumgang_meeting/app/api.py
- Memory evidence root: gumgang_meeting/status/evidence/memory
- Structure report: gumgang_meeting/status/evidence/structure_report_BT-13_v0.md

Group A — Memory & Evidence

CARD-01 — Memory Evidence Map (index)
- Priority/Effort: P1 / S
- Problem: status/evidence/memory contains tiers, search_runs, recall, anchor_runs, gate/* without a landing map.
- Proposal: Add a README index describing each subfolder purpose, file naming, daily roll-up, and the relationship between search_runs (per-run) and search (daily results); include sample queries, retention guidance, and paths.
- Evidence: status/evidence/memory/{search_runs,search}, app/api.py (/api/memory/search, /api/memory/recall), structure_report_BT-13_v0.md
- Acceptance: README exists; links ≥6 live artifacts; includes lifecycle diagram and retention days; “where to find X” FAQ included.
- Risk: Low (docs only). Status: Deferred.

CARD-02 — Checkpoint Rollover Plan
- Priority/Effort: P1 / M
- Problem: CKPT_72H_RUN.md grows large; anchor/_parse_recent_cards tails the whole file.
- Proposal: Define daily shard or summary file convention (e.g., status/checkpoints/daily/20250821.md) and a short “last N entries” cache file; code change deferred.
- Evidence: status/checkpoints/CKPT_72H_RUN.md, app/api.py (anchor), status/evidence/memory/anchor_runs
- Acceptance: Spec doc with filenames, rotation window, backward-compat notes; includes cache file schema and target max read ops per anchor run.
- Risk: Medium (design correctness). Status: Deferred.

CARD-03 — Anchor Run Summarizer Spec
- Priority/Effort: P2 / S
- Problem: anchor_runs/* are per-request; no daily summaries.
- Proposal: Specify a daily summarizer producing top intents, frequent scopes, and meeting co-occurrence fields; outline JSON schema.
- Evidence: status/evidence/memory/anchor_runs, app/api.py (/api/memory/anchor)
- Acceptance: JSON schema + example payload for summary file.
- Risk: Low. Status: Deferred.

CARD-04 — Search Results Log Map
- Note: Merged into CARD-01 (Memory Evidence Map); maintain in a single index to avoid duplication. Status: Deferred.

Group B — Gate & L5 (Ultra‑long)

CARD-05 — Gate API Contract Examples
- Priority/Effort: P1 / S
- Problem: Gate endpoints exist but examples live only in code/tests.
- Proposal: Create example request/response snippets for propose/patch/withdraw/approve/reject/list/item/stats; include 4‑Eyes, DUP, PII behaviors.
- Evidence: app/api.py (gate_*), status/evidence/memory/gate/*
- Acceptance: ≥1 worked example per endpoint with fields explained; examples use stable anchors (endpoint names/paths), not line ranges.
- Risk: Low. Status: Deferred.

CARD-06 — L5 DUP/PII Test Set Plan
- Priority/Effort: P1 / M
- Problem: Duplicate and PII rejection rely on runtime checks; test corpus not curated.
- Proposal: Define a tiny synthetic corpus under memory/tests covering DUP across approved set and tiers, and PII redaction expectations; execution later.
- Evidence: status/evidence/memory/gate/approved, status/evidence/memory/tiers, status/resources/memory/pii/patterns_v1.json, app/api.py (sha256_text, pii_scan_and_redact usage)
- Acceptance: Test plan doc + filenames and expected outcomes.
- Risk: Medium (good coverage design). Status: Deferred.

CARD-07 — Source Diversity Heuristic Note
- Priority/Effort: P3 / S
- Problem: “house-only relax” is configurable but undocumented externally.
- Proposal: Write a note clarifying ref_count_ok and source_diversity_ok heuristics, examples of pass/fail.
- Evidence: app/api.py (compute_source_diversity calls), status/design/memory_gate
- Acceptance: Note with 3 pass and 3 fail examples.
- Risk: Low. Status: Deferred.

Group C — Backend Ops/Security

CARD-08 — CORS Tightening via ENV
- Priority/Effort: P1 / S
- Problem: Dev defaults may include '*' with allow_credentials=False and allow_methods/headers='*'; needs explicit hardening guidance.
- Proposal: Document CORS_ALLOW_ORIGINS usage, enumerate secure defaults, and provide dev/prod profiles with examples.
- Evidence: app/api.py (/api/health + CORS middleware)
- Acceptance: Env matrix for dev/prod; examples for localhost/bridge; explicit note to avoid '*' in prod.
- Risk: Low. Status: Deferred.

CARD-09 — Health/Stats Index
- Priority/Effort: P2 / S
- Problem: Health endpoints and gate stats snapshots exist but not indexed.
- Proposal: Add STATUS page README listing /api/health and /api/memory/gate/stats, plus evidence file locations and fields.
- Evidence: app/api.py (/api/health, /api/memory/gate/stats), status/evidence/memory/gate/audit
- Acceptance: README with links and field descriptions.
- Risk: Low. Status: Deferred.

CARD-14 — Gate Audit Retention/Rollover Policy
- Priority/Effort: P1 / S
- Problem: Gate audit JSONL grows daily; retention/rollover policy is implicit.
- Proposal: Define retention window, rollover cadence (e.g., daily), and optional monthly snapshot; document restore/verification steps.
- Evidence: status/evidence/memory/gate/audit
- Acceptance: Policy doc with retention days, rollover schedule, snapshot filename conventions, and verification checklist.
- Risk: Low. Status: Deferred.

Group D — UI & DevX

CARD-10 — “House Map” Snapshot Index
- Priority/Effort: P2 / S
- Problem: UI snapshots exist without a simple index of what to look at first.
- Proposal: Create an index markdown referencing ui/snapshots/unified_A1-A4_v0 and how to reproduce.
- Evidence: ui/snapshots/unified_A1-A4_v0, ui/logs/*
- Acceptance: Index with 3+ anchor screenshots/logs linked.
- Risk: Low. Status: Deferred.

CARD-11 — A1/A5 Anchor UX Notes
- Priority/Effort: P3 / S
- Problem: Anchor evidence is visible but UX affordances (badges, refresh cadence) need documentation for next iteration.
- Proposal: Write short UX notes with minimal wireframes (ASCII) outlining badges and auto-refresh intervals; no code.
- Evidence: status/evidence/ui_mvp_gate_20250816_report.md, ui/logs/, app/api.py (/memory/anchor)
- Acceptance: Notes that can be turned into tickets.
- Risk: Low. Status: Deferred.

Group E — Repo Hygiene & Docs

CARD-12 — Memory vs Evidence Naming Clarification
- Priority/Effort: P2 / S
- Problem: memory/ (docs) vs status/evidence/memory (data) can confuse newcomers.
- Proposal: A one-pager explaining the separation and authoritative store.
- Evidence: memory/, status/evidence/memory
- Acceptance: One-pager with “authoritative paths” section.
- Risk: Low. Status: Deferred.

CARD-13 — Contributor Checklist (Read‑only)
- Priority/Effort: P3 / S
- Problem: No concise checklist for “how to add evidence, not code”.
- Proposal: Create a contributor‑facing checklist for evidence writes, quarantine, and append‑only checklists.
- Evidence: .rules, status/evidence/*, QUARANTINE/QUARANTINE.md
- Acceptance: Checklist fits on one screen; links to rules.
- Risk: Low. Status: Deferred.

End Notes
- Ownership suggestion: Local Gumgang drafts the specs; Web Gumgang polishes readability and grouping.
- All cards are documentation/spec-only. No code or data mutation will be performed in BT‑13.

Status: Deferred (all)