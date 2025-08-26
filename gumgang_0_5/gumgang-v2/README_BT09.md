# BT-09 — Packaging & Deployment Stabilization (gumgang-v2)

- 원칙: Core는 고정(포트/엔트리/증거 규율), UI는 오버레이로 자유 개선.
- 오버레이 경로: ui/overlays/active.css, ui/overlays/active.js (툴바 프로필 스위처 지원: ?overlay=…)
- 핵심 테스트: 재빌드 없이 오버레이 교체 반영, A4 버튼으로 Evidence 열기, SAFE/NORMAL 동형성.
- 명령:
  - 프리플라이트: npm run preflight:linux
  - 빌드 내보내기: npm run build:export
  - Evidence 열기: npm run bridge:open -- status evidence/<file>

Scope
- Goal: make Linux builds reliable and repeatable; standardize dev/run/build flow; add utilities to open Evidence files quickly.
- Targets: Tauri v2 app under this folder, with the external Bridge server serving UI and Evidence I/O.

Ports and Entrypoints
- Bridge server: http://localhost:3037 (serves /ui and /api)
- Next.js dev server: http://localhost:3000 (used by Tauri devUrl)
- Tauri window URL: http://localhost:3037/ui (see src-tauri/tauri.conf.json)

Prerequisites
- Node.js ≥ 18 and npm
- Rust toolchain (rustc ≥ 1.70, cargo; rustup recommended)
- Linux native libs (for Tauri/WebKitGTK):
  - pkg-config
  - webkit2gtk-4.1 development package
  - libsoup-3.0 development package
  - C/C++ compiler (gcc/clang)
- xdg-open (for file opening from Bridge; Linux)

Quick Preflight (Linux)
- Run native/toolchain checks:
  - npm run preflight:linux
- What it does:
  - Verifies Node/Rust/tauri CLI presence
  - Verifies pkg-config + webkit2gtk-4.1 + libsoup-3.0
  - Checks Tauri config sanity (devUrl, window URL) and Bridge presence
- If webkit2gtk/libsoup3 are missing, install using your distro’s package manager (see script hints).

Dev Workflows

Option A — Browser + Bridge only (fastest loop)
1) Start Bridge (from project root gumgang_meeting):
   - cd ../../.. && node bridge/server.js
   - Uses PORT=3037 by default (export PORT=3037 to override)
2) Open UI: http://localhost:3037/ui
3) Evidence saving uses Bridge /api/save, paths under gumgang_meeting/status/**.

Option B — Tauri (desktop dev)
Requirements:
- Bridge running at 3037 (see Option A step 1)
- Next dev at 3000 (to satisfy tauri devUrl)
Steps (in this folder):
1) Terminal A: npm run dev:fixed
   - Ensures Next.js on port 3000
2) Terminal B: ensure Bridge is running (see Option A)
3) Terminal C: npm run tauri:dev
   - Tauri dev will use devUrl http://localhost:3000, and the app window URL is set to http://localhost:3037/ui

Build (Production)
Note: tauri.conf.json expects frontendDist: ../out, so you must export a static build to out.
1) Install deps: npm ci
2) Build Next.js: npm run build
3) Export static assets to out:
   - npx next export -o out
   - Result should be in ../out alongside src-tauri
4) Build Tauri bundle:
   - npm run tauri:build
Artifacts are produced by Tauri (e.g., in src-tauri/target/release or in the Tauri CLI’s output directory).

Evidence Utilities

Open an Evidence file via OS (Linux/Win/macOS) using the Bridge endpoint:
- npm run bridge:open -- <root> <relativePath>
  - root: one of ui|conversations|sessions|status
  - example:
    - npm run bridge:open -- status evidence/ui_tab_nav_p95_20250820_GG-SESS-LOCAL.json
  - Bridge host is BRIDGE_URL (default http://localhost:3037)

Known UI Stability Notes (Linux + Tauri/WebKitGTK)
- Resize ghosting mitigations are in place; automatic recovery is ON by default.
- “저사양/Low-FX” toggle available in the UI toolbar to minimize effects.
- Manual “Repaint”/recovery controls exist if artifacts persist.

Troubleshooting
- Bridge cannot bind to 3037:
  - Another service uses the port. Stop it or set PORT before starting Bridge (export PORT=3038; node bridge/server.js) and adjust BRIDGE_URL accordingly.
- Tauri dev window is blank:
  - Ensure Bridge is up and serving /ui at the configured port.
  - Ensure Next dev is on port 3000 if the devUrl is used by the CLI.
- Tauri build fails on Linux:
  - Run npm run preflight:linux to confirm webkit2gtk-4.1 + libsoup-3.0 + pkg-config.
  - Check pkg-config path and that development headers are installed.

Scripts (package.json)
- npm run dev          → project-specific dev entry (may spawn Next)
- npm run dev:fixed    → Next dev on port 3000
- npm run build        → Next production build (.next)
- npm run tauri:dev    → Tauri development
- npm run tauri:build  → Tauri production bundle
- npm run ci:sanity    → Project sanity checks (type, guards, perf markers, bundle stats)
- npm run preflight:linux → Linux native deps + toolchain checks for Tauri
- npm run bridge:open  → Open a file via Bridge /api/open (OS default app)

Release Checklist (BT-09)
- [ ] Pass linux preflight (webkit2gtk-4.1, libsoup-3.0, pkg-config)
- [ ] Verify Bridge /api/save and /api/open in all target OSes
- [ ] Confirm Next export to out and Tauri build succeeds
- [ ] Smoke test UI: automatic recovery ON, Low-FX toggle, Evidence buttons
- [ ] Document BRIDGE_URL/PORT overrides and common failure modes
- [ ] Produce release notes with evidence paths (status/evidence/**)

References
- Tauri config: src-tauri/tauri.conf.json
- Bridge server: ../../../../bridge/server.js
- Evidence output (examples): ../../../../status/evidence/**