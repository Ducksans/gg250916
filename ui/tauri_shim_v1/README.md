# Tauri Shim v1 — Evidence Writer README

Purpose
- This shim adds exactly one Tauri command, `gg_save`, so the UI can persist evidence files under:
  - gumgang_meeting/status
  - gumgang_meeting/ui
  - gumgang_meeting/conversations
  - gumgang_meeting/sessions

The UI already contains a runtime interceptor that, when it detects Tauri, routes `fetch('/api/save')` to `window.__TAURI__.invoke('gg_save', payload)`. If Tauri is not present, it falls back to the bridge’s HTTP endpoint.

What you’ll do
1) Point Tauri’s window to the running bridge UI (http://localhost:3037/ui)
2) Add and register the `gg_save` command in your Tauri app (Rust)
3) Run the app and click A4 buttons to generate files
4) Verify files appear in gumgang_meeting/status/evidence

Prerequisites
- Bridge running at port 3037 (you already used this in the browser)
  - Run (if needed): `PORT=3037 node /home/duksan/바탕화면/gumgang_meeting/bridge/server.js`
- Rust + Tauri toolchain installed
- Linux path used in examples:
  - Project root: `/home/duksan/바탕화면/gumgang_meeting`
  - GUMGANG_ROOT: `/home/duksan/바탕화면`

Step 1 — Point Tauri window to the bridge UI
- Tauri v1 tauri.conf.json (example):
  {
    "tauri": {
      "security": {
        "dangerousRemoteDomain": "localhost"
      },
      "windows": [
        { "url": "http://localhost:3037/ui" }
      ]
    }
  }
- Tauri v2: allow remoteDomains/URL accordingly (see v2 docs)

Step 2 — Add the command (Rust)
- Use the provided shim source (see src/main.rs in this folder) or copy it into your app:
  - Place file as: src-tauri/src/main.rs (or split into modules as you prefer)
  - Ensure you register the command:
    tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![gg_save])
      .run(tauri::generate_context!())?;

Step 3 — Set environment and run
- Export base path so the shim can resolve WRITE_ALLOW roots correctly:
  export GUMGANG_ROOT="/home/duksan/바탕화면"
- Start Tauri:
  cargo tauri dev
- A window should open and load http://localhost:3037/ui

Step 4 — Generate evidence (no coding; just click)
- A4 탭 → 클릭:
  - “요약 저장” → creates: gumgang_meeting/status/evidence/ui_runtime_summary_YYYYMMDD_SESSION.json
  - “p95 측정” → creates: gumgang_meeting/status/evidence/ui_tab_nav_p95_YYYYMMDD_SESSION.json
  - “에러 스톰” → increases counts in JSONL (refresh Runtime Summary to view)
- Also expected during normal use:
  - gumgang_meeting/status/evidence/ui_tab_nav.log (tab switches)
  - gumgang_meeting/status/evidence/ui_runtime_YYYYMMDD_SESSION.jsonl (runtime events)
  - gumgang_meeting/status/evidence/ui_crash.log (first window error, one line)

Step 5 — Verify files
- Check these paths (examples):
  - /home/duksan/바탕화면/gumgang_meeting/status/evidence/ui_runtime_summary_2025MMDD_GG-SESS-LOCAL.json
  - /home/duksan/바탕화면/gumgang_meeting/status/evidence/ui_tab_nav_p95_2025MMDD_GG-SESS-LOCAL.json
  - /home/duksan/바탕화면/gumgang_meeting/status/evidence/ui_runtime_2025MMDD_GG-SESS-LOCAL.jsonl
  - /home/duksan/바탕화면/gumgang_meeting/status/evidence/ui_tab_nav.log
  - /home/duksan/바탕화면/gumgang_meeting/status/evidence/ui_crash.log

SAFE vs NORMAL (optional)
- NORMAL: http://localhost:3037/ui?safe=0
  - A3 tokenizer 부트 ON, A1 chat 허용(READ_ONLY_MODE와 API 키 환경에 따라)
- SAFE: http://localhost:3037/ui?safe=1
  - A3 tokenizer OFF, A1 chat disabled, evidence 로깅만

How it’s secured
- `gg_save` validates:
  - root ∈ {status, ui, conversations, sessions}
  - path must be non-empty, relative, and must not contain “..”
  - final target must stay under: $GUMGANG_ROOT/gumgang_meeting/<root>/**
- Directories auto-created when ensureDirs=true

Troubleshooting
- No files appear:
  - Check GUMGANG_ROOT is set and points to /home/duksan/바탕화면
  - Confirm Tauri has `invoke_handler(…gg_save…)` registered
  - Remote URL blocked: allow `localhost:3037` in Tauri config
- Still writing via bridge:
  - In Tauri devtools console: `!!window.__TAURI__ && !!window.__TAURI__.invoke` should be true
  - If false, interceptor will fall back to HTTP `/api/save`
- “path traversal blocked”:
  - Ensure the UI passes paths like `evidence/....` (no leading slash, no “..”)

Quick checklist (PASS criteria)
- A4 “요약 저장” produces ui_runtime_summary_*.json under status/evidence
- A4 “p95 측정” produces ui_tab_nav_p95_*.json under status/evidence
- “에러 스톰” then “새로고침” shows increased counts; JSONL updated
- Optional: Induce a test error to create ui_crash.log (one line)

Notes
- The shim doesn’t replace your app; it only provides a safe write path for evidence generation in the Tauri runtime.
- You can keep using the bridge for everything else; the UI will seamlessly choose Tauri invoke when available and fall back to the bridge otherwise.
