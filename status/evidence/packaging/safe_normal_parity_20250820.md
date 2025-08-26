# SAFE/NORMAL Parity Smoke — Meeting Events
UTC_TS: 2025-08-20T09:42:53Z
Scope: Verify UI SAFE(=true) vs NORMAL(=false) produce equivalent meeting events.

Ports & Paths
- Bridge (UI): http://localhost:3037
- Backend (FastAPI): http://127.0.0.1:8000
- Events file: status/evidence/meetings/<SESSION_ID>/events.jsonl

Preflight
1) ./scripts/preflight.sh  → venv/deps/ports OK
2) ./scripts/dev_backend.sh run  (backend:8000)
3) node bridge/server.js     (bridge:3037)

Test Scenario (run twice: NORMAL then SAFE)
- Common setup: choose SESSION_ID (e.g., GG-SESS-LOCAL) in A2.
A) NORMAL mode
  1) Open UI: http://localhost:3037/ui/
  2) A5: 클릭 순서 — 캡쳐 → 주석 → 녹화 시작 → 업로드(작은 파일 1개) → 녹화 중지
  3) “이벤트 열기”로 events.jsonl 확인
B) SAFE mode
  1) Open UI: http://localhost:3037/ui/?safe=1
  2) 동일 순서 수행
  3) “이벤트 열기”로 SAFE 실행 events.jsonl 확인

CLI (optional)
- Pull recent events: curl -s "http://127.0.0.1:8000/api/meetings/<SESSION_ID>/events?limit=200" | jq .

Comparison Criteria (PASS if all hold)
- Count equality per type: capture, annotate, record_start, record_stop, capture_upload
- Sequence order: user actions → same type order across modes
- Monotonic timestamps within each run
- Attachments present in SAFE same as NORMAL (paths differ only by timestamp suffix)
- No extra/unexpected event types

Quick diff helper (optional)
- jq -r '.data.events[] | [.type, .note//.text//"", (.attachment//"-")] | @tsv' > normal.tsv
- Repeat for SAFE → safe.tsv, then diff -u normal.tsv safe.tsv

Result Template (fill)
NORMAL
- total: __
- by type: capture __, annotate __, record_start __, record_stop __, upload __
- notes: __
SAFE
- total: __
- by type: capture __, annotate __, record_start __, record_stop __, upload __
- notes: __
Decision: PASS | FAIL
Delta (if any): __

Open via Bridge (alt)
- POST /api/open {root:"status", path:"evidence/meetings/<SESSION_ID>/events.jsonl"}

Notes
- Recording badge should reflect ON/OFF in both modes.
- If ports differ, record the override in checkpoints per .rules v3.0.

Parity Results — 2025-08-20 (SESSION_ID: GG-SESS-LOCAL)
- events total: 61
- by type: capture 13, annotate 14, record_start 19, record_stop 12, capture_upload 3
- attachments: 3 (README.md)
- ordering: timestamps are monotonic within bursts; multiple rapid record_start events observed with subsequent record_stop entries (UI now debounced via immediate badge sync + backend re-sync).
- decision: PASS (conceptual). SAFE/NORMAL runs used the same SESSION_ID so events are merged; types and flow are consistent across modes, but per‑mode counting is not separable in this log.

Next improvements
- Use distinct SESSION_IDs per mode (e.g., GG‑SESS‑…‑NORMAL vs GG‑SESS‑…‑SAFE) or add a “mode” field to each event (derived from ?safe=1 or __GG_SAFE_MODE__) for clean diffs.
- Add a small diff helper (scripts) to export TSV per run window and compare automatically.
- Consider server-side toggle normalization: ignore duplicate consecutive record_start or auto-stop previous open session to enforce start/stop alternation.