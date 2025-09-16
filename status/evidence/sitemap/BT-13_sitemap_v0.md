---
phase: past
---

# BT-13 Sitemap v0 (read-only) — Static vs Dynamic Evidence Map

Scope
- One-page “house map” to locate core/static docs and dynamic evidence hubs at a glance.
- Backlink-style notes to show how documents connect, for quick onboarding and navigation.
- Read-only. No code execution or behavioral changes.

Legend
- [C] Core/SSOT
- [H] Hub/Index
- [S] Static docs (concepts, specs, policies)
- [D] Dynamic evidence (logs, runs, json/jsonl artifacts)
- [A] API surface (implemented in code; referenced here)

Reading order (suggested)
1) [C][S] gumgang_meeting/.rules
2) [C][S] gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
3) [C][A] gumgang_meeting/app/api.py
4) [S]    gumgang_meeting/status/design/*
5) [H][D] gumgang_meeting/status/evidence/* (per-need)

Core/SSOT anchors
- [C][S] Rules: gumgang_meeting/.rules
  - Policies: WRITE_ALLOW, DENY_GLOBS, APPEND_ONLY, Ports/Entrypoints, BT-11..21 compass
- [C][S] Checkpoints: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
  - Single source of 72H run entries (append-only)
- [C][A] Backend API: gumgang_meeting/app/api.py
  - Meetings: /api/meetings/*
  - Memory: /api/memory/store, /api/memory/search, /api/memory/recall
  - Memory Gate: /api/memory/gate/{propose,patch,withdraw,approve,reject,list,item,stats}
  - Anchoring: /api/memory/anchor
- [S] Memory Gate Design: gumgang_meeting/status/design/memory_gate/{API.yaml,DECISIONS.md,SSOT.md}
- [S] UX/Design: gumgang_meeting/status/design/{ui_integration.md,risks.md,ux_charter.md,roadmap_BT07_BT10.md}
- [S] Guards/Notes: gumgang_meeting/status/notes/*

Static docs hub [H][S]
- Project docs: gumgang_meeting/docs/*
- Draft notes: gumgang_meeting/draft_docs/*
- Context observer: gumgang_meeting/context_observer/*
- Tasks: gumgang_meeting/status/tasks/*
- Roadmap: gumgang_meeting/status/roadmap/*
- Resources:
  - Memory no-hit templates: gumgang_meeting/status/resources/memory/nohit_templates_ko_v1.json
  - PII patterns (v1): gumgang_meeting/status/resources/memory/pii/patterns_v1.json
  - Vector ingest logs dir: gumgang_meeting/status/resources/vector_index/

Dynamic evidence hub [H][D]
- Memory Evidence: gumgang_meeting/status/evidence/memory/
  - tiers/               (5-tier JSONL storage)
  - search_runs/YYYYMMDD (per-search run payloads)
  - search/              (daily result summaries)
  - recall/              (recent recall cards)
  - anchor_runs/YYYYMMDD (uncontrolled speech anchoring evidence)
  - gate/
    - pending/YYYYMMDD/*.json
    - approved/YYYYMMDD/*.json
    - rejected/YYYYMMDD/*.json
    - audit/YYYYMMDD/audit.jsonl (+ stats_*.json, dedup_debug_*.jsonl)
- Meetings Evidence: gumgang_meeting/status/evidence/meetings/<meeting_id>/{events.jsonl,attachments/}
- UI Evidence: gumgang_meeting/status/evidence/ui_*.*
- Tools/Probe: gumgang_meeting/status/tools_probe/*
- Quarantine: gumgang_meeting/QUARANTINE/* (manifest at QUARANTINE/QUARANTINE.md)
- Sessions/Conversations: gumgang_meeting/sessions/*, gumgang_meeting/conversations/*

BT-13-produced documents (anchors)
- [S] Structure report v0: gumgang_meeting/status/evidence/structure_report_BT-13_v0.md
- [S] Improvement cards v0: gumgang_meeting/status/evidence/improvement_cards/BT-13_cards_v0.md
- [S] (this file) Sitemap v0: gumgang_meeting/status/evidence/sitemap/BT-13_sitemap_v0.md

Backlink-style notes (who points to whom)
- .rules
  - Referenced by: structure_report_BT-13_v0.md, BT-13_cards_v0.md, general contributor guidance
- status/checkpoints/CKPT_72H_RUN.md
  - Read by: app/api.py (/api/memory/anchor), referenced by structure_report_BT-13_v0.md
- app/api.py
  - Referenced by: structure_report_BT-13_v0.md, BT-13_cards_v0.md (examples/spec alignment)
- status/design/memory_gate/*
  - Referenced by: structure_report_BT-13_v0.md; target of CARD-05 (example enrichment)
- status/evidence/memory/*
  - Referenced by: structure_report_BT-13_v0.md, BT-13_cards_v0.md (CARD-01 map, CARD-06 tests)
- status/resources/memory/pii/patterns_v1.json
  - Used by: app/gate_utils.py (PII scan/redact); referenced by BT-13_cards_v0.md

High-level map (ASCII)
[C].rules
 ├─[C] status/checkpoints/CKPT_72H_RUN.md
 │   └─[A] /api/memory/anchor (reads recent cards)
 ├─[A] app/api.py
 │   ├─[D] status/evidence/meetings/<id>/*
 │   └─[D] status/evidence/memory/{tiers,search_runs,search,recall,anchor_runs,gate/*}
 └─[S] status/design/* → informs → [A] app/api.py behavior (spec alignment)

Navigation tips
- Prefer stable anchors: endpoint names/paths over line ranges.
- For “where is X stored?” start at: status/evidence/memory/ (hub README to be added per CARD-01).
- For gate lifecycle: start at status/design/memory_gate/ then inspect status/evidence/memory/gate/*.

Operational notes (read-only)
- Checkpoints are append-only. Add new entries to the end of CKPT_72H_RUN.md.
- CORS hardening guidance lives in improvement cards (CARD-08) until a dedicated note is added.
- Gate audit retention policy is tracked by CARD-14 and audit/* evidence.

Onboarding quickstart
1) Read .rules → understand boundaries and ports.
2) Skim CKPT_72H_RUN.md (last ~20 entries).
3) Browse app/api.py endpoints list.
4) Jump to evidence hub(s) relevant to your task (memory/meetings/ui).
5) Consult design docs when changing policies/specs (in BT-14+ only).

Status
- Version: BT-13 v0 (documentation only)
- Ownership: Local Gumgang drafts; Web Gumgang may polish readability.
- Next: Add memory evidence README (CARD-01) and checkpoint rollover spec (CARD-02) as separate docs.