# Phase 2 Sample Note — Unified Search FileRetriever v0

Date: 2025-08-25
Location: projects/phase2_sample_note.md
Scope: BT-12 / ST-1205 — Phase 2 (FileRetriever v0, whitelist + kw+mtime)

Purpose
- Provide a small, whitelisted file with clear keywords for Phase 2 tests.
- Enable Unified Search (memory + files) to return file-channel evidence when FILE_RETRIEVER_ENABLED=true.
- This note should be discoverable by keyword coverage and mtime-based recency.

Key Terms (for kw score)
- unified search, file retriever, whitelist, kw score, mtime, freshness, strict grounded mode, SGM, evidence, source mix, post items, top-k, phase 2, ST-1205

Test Hints
- Expected queries that should hit this file:
  - "unified search phase 2"
  - "file retriever v0 whitelist"
  - "strict grounded evidence"
  - "sgm source mix files"
  - "kw mtime scoring"
- Snippet target sentence (designed to surface in results):
  - Unified Search Phase 2 integrates a file retriever v0 using a whitelist with kw score and mtime-based recency to produce grounded evidence from files.

Acceptance Criteria (Phase 2, file channel)
- When FILE_RETRIEVER_ENABLED=true and FILE_WHITELIST includes "projects", source_mix.file should be > 0 for queries containing the above terms.
- Evidence includes:
  - path: gumgang_meeting/projects/phase2_sample_note.md
  - snippet: a short excerpt containing keywords (e.g., “file retriever v0 … whitelist … kw score … mtime … strict grounded mode (SGM) …”).
  - ts: ISO timestamp from file mtime.
  - score: kw + 0.6*recency (v0 heuristic).
  - reason: { kw, recency, refs: 0.0 }

Why this matters
- Phase 2 validates that Unified Search can blend memory evidence with file evidence safely (default OFF, whitelist-only).
- Together with SGM (근거 없으면 호출 금지), this ensures answers cite real local files when memory is insufficient.

Notes
- Keep this file small and text-only to avoid binary filters.
- Safe to duplicate keywords to lift kw coverage slightly for demos.

Checklist
- [x] File placed under a whitelisted directory (projects/)
- [x] Contains explicit keywords for kw-based matching
- [x] Human-readable snippet lines present
- [x] No PII, no secrets, text-only

EOF