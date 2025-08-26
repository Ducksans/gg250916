# BT-09 Release Checklist (Packaging/Deployment Stabilization)

Scope: Tauri v2 app + bridge on Linux first, then Win/macOS parity.

1) Project/Gates
- [ ] .rules v3.0 applied; checkpoint appended
- [ ] CHECKPOINT cadence followed; evidence paths cited

2) Environment
- [ ] gumgang_meeting/.env present; BRIDGE_PORT=3037
- [ ] BACKEND_ENTRYPOINT noted (uvicorn app.api:app --port 8000) if used

3) Linux Preflight (Native + Toolchains)
- [ ] pkg-config, gcc/clang
- [ ] webkit2gtk-4.1, libsoup-3.0
- [ ] Node >= 18, npm
- [ ] rustc >= 1.70, cargo, rustup
- [ ] @tauri-apps/cli available
- [ ] Run: gumgang_0_5/gumgang-v2/scripts/ci/linux_preflight.sh (npm run preflight:linux)

4) Config Sanity
- [ ] tauri.conf.json: build.devUrl=http://localhost:3000
- [ ] tauri.conf.json: app.windows[0].url=http://localhost:3037/ui
- [ ] bridge/server.js reachable at BRIDGE_PORT

5) Build/Run Scripts
- [ ] npm run dev (frontend) / bridge server runs separately
- [ ] npm run tauri:dev (integration dev)
- [ ] npm run tauri:build (packaging)

6) Evidence I/O
- [ ] /api/save writes to status/*
- [ ] /api/open opens target via OS (bridge endpoint)
- [ ] A4 Evidence buttons: runtime.jsonl path, tab p95 path, runtime summary copy
- [ ] Tab p95 tool saves to status/evidence

7) UX Stability (Linux+Tauri)
- [ ] Auto-recovery on resize works (default ON)
- [ ] LowFX toggle works and persists
- [ ] Sticky button feedback persists across tabs

8) Packaging Artifacts
- [ ] Version bump (package.json, tauri.conf.json)
- [ ] Icons/metadata
- [ ] Generated installers open UI to /ui and evidence works

9) QA Matrix
- [ ] Fresh boot → first render
- [ ] Maximize/restore/resize → no persistent ghosting
- [ ] Offline bridge fallback behavior
- [ ] File open via bridge: npm run bridge:open -- status <relative_path>

10) Release Docs
- [ ] Changelog + known issues
- [ ] Install prereqs (Linux deps)
- [ ] Rollback plan and support contacts

Sign-off:
- [ ] Owner
- [ ] QA
- [ ] Date / Evidence links

11) Overlay & Evidence Open
- [ ] Use snapshot entry `ui/snapshots/unified_A1-A4_v0/index.html`
- [ ] Auto-inject overlays when present: `ui/overlays/active.css` / `ui/overlays/active.js` (no rebuild)
- [ ] From A4, open Evidence via bridge `/api/open` (runtime.jsonl, tab p95)
- [ ] `gg_save` (tauri) and `/api/save` (bridge) produce identical contents
- [ ] Pass in both SAFE and NORMAL modes
- [ ] Save preflight result: `status/evidence/preflight_linux_*.json`
- [ ] Respect fixed ports/entries (bridge:3037, backend:8000)