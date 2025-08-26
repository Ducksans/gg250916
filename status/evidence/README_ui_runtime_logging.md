# UI Runtime Logging — SAFE_MODE Evidence

Scope
- This README describes runtime evidence generated when SAFE_MODE is active in the unified A1–A4 snapshot.

How to enable SAFE_MODE
- Open: /ui/snapshots/unified_A1-A4_v0/index.html?safe=1
- Or set: localStorage.setItem('gg_safe_mode','1')
- UI shows a SAFE badge; heavy features are gated (A3 tokenizer disabled, A1 chat send disabled).

Where logs are written
- Directory: gumgang_meeting/status/evidence/
- Transport: bridge /api/save with root="status" (WRITE_ALLOW compliant; append-only semantics).

Files produced

1) ui_runtime_YYYYMMDD_SESSION.jsonl
   - Content: one JSON per line.
   - First line: boot header {type:"boot", ts, ua, safe_mode}.
   - Subsequent lines (examples):
     - {type:"error", ts, msg, file, line, col, stack}
     - {type:"unhandledrejection", ts, msg, stack}
     - {type:"console.error"|"console.warn", ts, args:[…]}
   - Flush cadence: ~3s or buffered (~800ms on burst).
   - Rotation: by date (YYYYMMDD) + session id.

2) ui_crash.log
   - Appended once on first window error (session run):
     ISO8601 - <message> @ <file>:<line>:<col>

3) ui_tab_nav.log
   - One line per tab switch (1–4, Ctrl/Cmd+←/→):
     ISO8601 #aN <latency_ms>ms
   - Used to verify UX gate (p95 ≤ 50ms).

Test quickly
- Enable SAFE_MODE (above), then:
  - Switch tabs to populate ui_tab_nav.log.
  - In DevTools console: setTimeout(()=>{throw new Error("probe")},0)
    → writes to ui_runtime_*.jsonl and ui_crash.log.

Disable SAFE_MODE
- Remove ?safe=1 and localStorage.removeItem('gg_safe_mode').

References
- Design and evidence hooks: status/design/ui_integration.md#L1-200