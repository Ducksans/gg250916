# A6.3 Checkpoints Panel — Design Spec (BT‑14 ST‑1405)

Purpose
- Provide a read‑only, trustworthy view of project checkpoints (SSOT) with integrity signals.
- Enable day‑by‑day browsing and quick verification of the JSONL hash chain status.
- Keep edits impossible from the UI; all writes occur via server API only.

Scope (MVP)
- Daily Markdown view of checkpoints (6‑line blocks).
- Tail(50) panel with chain badge (OK/FAIL) and last hash/ts/seq.
- Date picker (UTC), fmt toggle(md/json), refresh, copy helpers.
- Evidence link utilities (copy path; open in viewer if available).

Out of Scope (MVP)
- In‑UI append/editing.
- Historical diff visualization.
- Multi‑file merge/backfill.

Read Path / SSOT
- SSOT: status/checkpoints/CKPT_72H_RUN.jsonl (append‑only, hash‑chain).
- Human stub: status/checkpoints/CKPT_72H_RUN.md (Generated — DO NOT EDIT).
- UI reads via backend only; never touches files directly.

APIs (wired)
- GET /api/checkpoints/view?date=YYYY‑MM‑DD&fmt=md|json
  - md → { ok, view: string, meta: { chain_ok, break_index, last_hash, last_ts, last_seq, count } }
  - json → { ok, items: [record…], meta: same as above }
- GET /api/checkpoints/tail?n=50
  - → { ok, chain_status:"OK"|"FAIL", last_hash, last_ts, last_seq, items:[latest_first…] }

Data Shapes (examples)
- view(md):
  {
    "ok": true,
    "view": "RUN_ID: 72H_20250821_1208Z\nUTC_TS: 2025-08-21T12:08:32Z (seq:1)\nSCOPE: TASK(BT-14.PHASE1)\nDECISION: ...\nNEXT STEP: ...\nEVIDENCE: gumgang_meeting/...#L1-60\n",
    "meta": { "chain_ok": true, "last_hash": "…64hex", "last_ts": "…Z", "last_seq": 1, "count": 42 }
  }
- tail:
  {
    "ok": true,
    "chain_status": "OK",
    "last_hash": "…64hex",
    "last_ts": "…Z",
    "last_seq": 3,
    "items": [{ "run_id":"…", "utc_ts":"…Z", "seq":3, "scope":"…", "decision":"…", "next_step":"…", "evidence":"gumgang_meeting/…#Lx-y", "prev_hash":"…", "this_hash":"…", "writer":"app" }, …]
  }

UI Layout
- TopBar: [Date(UTC)] [fmt md/json] [Refresh] [Copy Day] [Help]
- Body (2‑pane):
  - Center: Daily view
    - md: preformatted 6‑line blocks with minimal styling
    - json: compact table (run_id, utc_ts(seq), scope, evidence)
  - Right: Chain Panel
    - Chain badge: OK/FAIL
    - Tail(50) list (latest first)
    - last_ts/hash/seq, count
    - Actions: Copy last hash; Copy last 50 as JSON
- Footer: “효력은 EOF 기준” badge, server ts, API base

Interactions
- Date change → fetch view(date, fmt), update chain panel.
- fmt toggle → refetch with new fmt; preserve date.
- Refresh → re‑fetch both view and tail.
- Copy Day → copy raw md view (fmt=md) to clipboard; alternative: save .md.
- Evidence link in block:
  - “Copy path” button copies EVIDENCE: path.
  - If viewer bridge exists, expose “Open” (best effort).

State & Query
- State: { date(UTC), fmt(md|json), view, tail, meta, loading, error }
- Effects:
  - onMount: date=today(UTC) → fetch view(md) + tail(50)
  - onDate/fmt change: refetch view
  - onRefresh: refetch both

Integrity & EOF Rules
- Show chain badge from tail.chain_status.
- In view(md), display “효력은 EOF 기준(Trust EOF order)” note.
- If chain FAIL:
  - Red badge, succinct hint “Investigate JSONL chain; block appends”
  - Link to HOOKS_SETUP.md and ckpt_lint.py

Error/Empty States
- Server down: “Backend unreachable — retry” + API endpoint shown.
- No entries for date: “No checkpoints for this UTC date.”
- tail empty: show placeholder; badge suppressed (neutral).

Accessibility
- Keyboard: d(next day), D(prev day), r(refresh), j/k(scroll), c(copy day).
- Labels with visible focus, AA contrast; motion‑reduced updates.

Performance Targets
- view(date, md) load ≤ 500ms typical.
- tail(50) load ≤ 300ms typical.
- Render “above the fold” within 1s on mid‑tier hardware.

Security/Policy
- Read‑only; no append endpoint exposed from the panel.
- Never allow editing of CKPT_72H_RUN.md; it’s a stub.
- Evidence path is displayed as text; no file access from UI.

Test Plan (ST‑1405)
- Unit
  - Date parsing (UTC), fmt toggle switches, state transitions.
  - Render md vs json modes, copy helpers.
- Integration
  - Mock GET /api/checkpoints/view/tail — success/empty/error/FAIL chain.
  - Today default flow: both requests issued; chain badge reflects tail.
- Manual Smoke
  - Change date (yesterday/today) → md view updates; tail updates.
  - Copy Day/Copy last hash → clipboard content matches.

Acceptance Criteria
- A6.3 renders today’s md view and tail(50) with chain badge in ≤ 1.5s.
- Date/fmt/refresh work; errors handled with guidance.
- No write operations are possible from the panel.
- EOF badge and integrity signals are clearly visible.

Deep Links
- /ui/a6?tab=checkpoints&date=2025‑08‑21&fmt=md

Implementation Notes
- Keep fetchers small; debounce rapid date changes.
- Preserve last successful view while loading (spinner overlay).
- Localize labels; default KO with concise EN tooltips.

References
- Spec: status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md
- Hooks: status/design/checkpoints/HOOKS_SETUP.md
- Backend: app/api.py (/api/checkpoints/view|tail)
- Stub: status/checkpoints/CKPT_72H_RUN.md (DO NOT EDIT)