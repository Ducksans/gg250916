---
phase: past
---

# ST-0102 — Tauri config fix and minimal execution checklist

Purpose
- Fix Tauri config schema error blocking dev run.
- Provide a minimal checklist to verify Monaco editor renders and opens a file.

Symptom
- Tauri dev failed with:
  Error `tauri.conf.json` error on `app > security`: Additional properties are not allowed ('dangerousRemoteDomainIpcAccess' was unexpected)

Root Cause
- Tauri v2 config schema does not allow `app.security.dangerousRemoteDomainIpcAccess`.

Fix (edit tauri.conf.json)
- Remove `dangerousRemoteDomainIpcAccess` from the security section.

Before (problematic)
```
"security": {
  "csp": null,
  "dangerousRemoteDomainIpcAccess": []
}
```

After (valid)
```
"security": {
  "csp": null
}
```

Run/Verify (minimal)
1) Install Node deps:
   - cd gumgang_meeting/gumgang_0_5/gumgang-v2
   - npm install
2) Optional sanity: npx --yes --package @tauri-apps/cli tauri --version
3) Start dev (pick one):
   - npx tauri dev
   - or npm run tauri:dev
   - Alt (web only to prove Monaco): npm run dev:fixed and open http://localhost:3000/editor
4) PASS criteria:
   - App starts without tauri.conf.json schema errors.
   - /editor shows “Powered by Monaco Editor + Tauri”.
   - Open a file tab; Monaco renders and displays contents.

Ubuntu prerequisites (if build fails)
- sudo apt-get update && sudo apt-get install -y build-essential libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev patchelf
- Rust: https://www.rust-lang.org/tools/install (then: source $HOME/.cargo/env)

Evidence
- Tauri config (shows offending key to remove):
  - gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/tauri.conf.json#L18-28
- Monaco editor component present:
  - gumgang_meeting/gumgang_0_5/gumgang-v2/components/editor/MonacoEditor.tsx#L1-60
- Editor page shows Monaco banner text:
  - gumgang_meeting/gumgang_0_5/gumgang-v2/app/editor/page.tsx#L220-236
- Project scripts (tauri/dev):
  - gumgang_meeting/gumgang_0_5/gumgang-v2/package.json#L1-40

Notes
- If npx tauri is unavailable globally, use the explicit form:
  npx --yes --package @tauri-apps/cli tauri dev
- After confirming PASS, append ST-0102 PASS to SSOT checkpoint with one Evidence path above.