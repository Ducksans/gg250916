# USER DIRECTIVE — Full Author Mode (v3.0) vs Current Rules (v2.0)

Context
- User requests “.rules v3.0 — Full Author Mode” (write to all under gumgang_meeting/**).
- Current project contract in effect: `.rules v2.0` (Non‑Negotiables: do not modify .rules during 72h run; WRITE_ALLOW = [ui, conversations, sessions, status]).

Our Policy (evidence-first)
- We acknowledge the directive and will maximize progress now while strictly honoring `.rules v2.0`.
- We will:
  - Execute edits directly in: gumgang_meeting/ui, /conversations, /sessions, /status
  - Produce ready-to-paste patches for outside scopes (e.g., gumgang_0_5/src-tauri)
  - Log all decisions with 6-line checkpoints + evidence paths

What We Already Did (within WRITE_ALLOW)
- SAFE/NORMAL shell hardening, runtime/crash/tab logs, automation tools (p95/Storm).
- Tauri dual-path writer (UI): fetch('/api/save') → tauri invoke('gg_save') if present.
- Handoff docs and exact Rust config snippets.

User‑Apply Patch (outside WRITE_ALLOW; copy/paste)
1) Add gg_save command to Tauri:
- File: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/src/main.rs
  - Insert gg_save block (SaveReq, safe_join, #[tauri::command] gg_save)
  - Register in invoke_handler: …, grep_in_files, gg_save
2) Open bridge UI in Tauri:
- File: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/tauri.conf.json
  - windows[0].url = "http://localhost:3037/ui"
  - app.security.dangerousRemoteDomain = "localhost"
3) Run:
- export GUMGANG_ROOT="/home/duksan/바탕화면"
- (if needed) PORT=3037 node gumgang_meeting/bridge/server.js
- cargo tauri dev

Expected Evidence (PASS)
- status/evidence/ui_runtime_summary_YYYYMMDD_*.json
- status/evidence/ui_tab_nav_p95_YYYYMMDD_*.json
- status/evidence/ui_runtime_YYYYMMDD_*.jsonl, ui_tab_nav.log, ui_crash.log

Where to Find Full Snippets
- Handoff (step-by-step): status/handoff/TAURI_ST0705_APPLY.md
- UI Tauri interceptor: ui/snapshots/unified_A1-A4_v0/index.html (fetch→invoke)

Path to v3.0
- Per v2.0 §10, we cannot edit .rules during the 72h run.
- If you still want v3.0 now: you (human) may update .rules and checkpoint it; after that, we will operate under the new WRITE_ALLOW.
- Until then, we continue shipping changes + patches with full transparency.

STOP NOW honored on request.