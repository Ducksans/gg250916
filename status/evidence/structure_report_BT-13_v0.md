# BT-13 Self‑Structure Report v0 (read‑only)

Scope
- Show current repo shape and key components. No edits performed. Execution deferred until BT‑14.

Top‑level
- app/, bridge/, ui/, status/, memory/, conversations/, sessions/, scripts/, docs/, draft_docs/, projects/ (empty), units/ (empty), gumgang_0_5/ (legacy), QUARANTINE/, obsidian_vault/, archive_docs/, venv/
- Rules/ports: gumgang_meeting/.rules; backend entry uvicorn app.api:app --port 8000; bridge default 3037

Backend (FastAPI)
- app/api.py: health, meetings capture/upload/annotate/record start/stop/status/events, memory store/search/recall, gate propose/approve/reject/list/item/stats, anchor
  - Evidence roots: status/evidence/meetings/*, status/evidence/memory/*
  - Gate L5 writes guarded by gate_token + sha256; 4‑Eyes; PII redaction path
  - Refs: gumgang_meeting/app/api.py#L1-220, gumgang_meeting/app/api.py#L800-1460, gumgang_meeting/app/api.py#L1460-2100
- app/gate_utils.py: token/audit/utilities (see file for impl)

Bridge
- bridge/server.js (PORT 3037), dev shim. Refs: gumgang_meeting/bridge/server.js#L1-120

UI (proto/shims/logs)
- ui/proto/{chat_view_A1, session_task_A2, tools_panel_A3}
- ui/tauri_shim_v1/, ui/overlays/, ui/snapshots/, ui/tools/tokenizer, ui/logs/*

Status (SSOT, design, probes, evidence)
- status/checkpoints/CKPT_72H_RUN.md (append‑only run log; very large)
- status/design/* (apis, risks, ui integration), status/tools_probe/*, status/notes/*, status/roadmap/*
- .rules APPEND_ONLY applies to status/checkpoints/*.md (append-only policy)
- status/evidence/memory/{tiers, search_runs, search, recall, anchor_runs, gate/*}
- status/resources/memory/pii/patterns_v1.json (PII patterns v1; used by gate_utils.py)

Memory (docs)
- memory/{bookmarks.md, memory.log, session_index.md}; primary data under status/evidence/memory/*

Conversations & Sessions
- conversations/{GG-SESS-LOCAL,...}, sessions/*

Legacy/Quarantine
- gumgang_0_5/ (large legacy; IMPORT_ENABLED=false by BT‑11)
- QUARANTINE/* with manifest. Refs: gumgang_meeting/QUARANTINE/QUARANTINE.md#L1-200

Tree snapshot (focused)
- app/{api.py, gate_utils.py}
- status/evidence/memory/{tiers/, search_runs/, anchor_runs/, gate/{pending,approved,rejected,audit}/}
- ui/{proto/, tauri_shim_v1/, overlays/, snapshots/, tools/}

Hotspots
- CKPT_72H_RUN.md size/growth; evidence sprawl under memory/*
- Dual memory roots (memory/ vs status/evidence/memory/) may confuse
- Bridge/Backend CORS defaults include '*' with allow_credentials=False and allow_methods/headers='*' (dev); hardening planned via ENV

Gaps
- No single “map” of memory artifacts
- Gate docs exist in status/design/memory_gate, but need sync with current endpoints and more worked examples
- Sparse smoke tests for DUP/PII across L5 daily files

Bottlenecks
- File‑scanning JSONL tails on large sets
- Manual diversity checks can be noisy

Improvement Cards (deferred; no execution)
- CARD-01 Map memory evidence: add README index under status/evidence/memory/. Refs: status/evidence/memory#L1-1
- CARD-02 CKPT rollover: add daily shard or summary to reduce read cost. Refs: status/checkpoints/CKPT_72H_RUN.md#L1-60
- CARD-03 Gate API spec: extend status/design/memory_gate/* with examples from app/api.py. Refs: app/api.py#L1060-1460
- CARD-04 CORS tightening plan for bridge/backend with env toggles. Refs: app/api.py#L212-260
- CARD-05 L5 duplicate/PII test set under status/evidence/memory/tests/. Refs: status/evidence/memory/tests#L1-1
- CARD-06 “House map” UI snapshot linking evidence paths in ui/snapshots/unified_A1-A4_v0. Refs: ui/snapshots/unified_A1-A4_v0#L1-1

End
- Report generated for BT‑13 ST‑1301. No files modified besides this evidence note.