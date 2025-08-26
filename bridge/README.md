# Bridge README

Lightweight HTTP bridge for local UI and evidence I/O.

- Default port: 3037 (override with `PORT`)
- Base URL: `http://localhost:3037`
- Allowed roots → on-disk directories:
  - `ui` → `gumgang_meeting/ui`
  - `conversations` → `gumgang_meeting/conversations`
  - `sessions` → `gumgang_meeting/sessions`
  - `status` → `gumgang_meeting/status`

Notes
- All API bodies/outputs are JSON. Paths must be relative (no absolute paths) and will be normalized and restricted to the selected root to prevent traversal.
- CORS/preflight is handled by the server.
- No auth; run on trusted networks only.

## POST /api/save
Save a text file under an allowed root.

Request body
- `root` string: one of `ui|conversations|sessions|status`
- `path` string: relative path under the root (e.g. `evidence/my_note.txt`)
- `content` string: file text content
- `overwrite` boolean: default true; if false and file exists → 409
- `ensureDirs` boolean: default true; create parent directories recursively

Response (200)
- `{ ok: true, data: { root, path, bytes }, meta }`
  - `path` is the project-relative path actually written

Errors
- 400 invalid JSON | invalid root | empty/absolute path
- 403 path traversal blocked
- 409 file exists (when `overwrite: false`)
- 500 write failed

Example (curl)
    curl -sS -X POST http://localhost:3037/api/save \
      -H "Content-Type: application/json" \
      -d '{"root":"status","path":"evidence/demo.txt","content":"hello","overwrite":true,"ensureDirs":true}'

## POST /api/open
Ask the OS to open an existing file (Explorer/Finder/default app) via:
- macOS: `open`
- Windows: `cmd /c start`
- Linux: `xdg-open`

Request body
- `root` string: `ui|conversations|sessions|status`
- `path` string: relative path under the root

Response (200)
- `{ ok: true, data: { path, platform, cmd, args }, meta }`

Errors
- 400 invalid JSON | invalid root | empty/absolute path
- 403 path traversal blocked
- 404 file not found
- 500 open failed

Example (curl)
    curl -sS -X POST http://localhost:3037/api/open \
      -H "Content-Type: application/json" \
      -d '{"root":"status","path":"evidence/demo.txt"}'

## Quick start (development)
- From project root, run the Node server (long-running):
    node bridge/server.js
- Then use the endpoints above from your UI/tools.

## Tips
- Save then open:
    curl -sS -X POST http://localhost:3037/api/save \
      -H "Content-Type: application/json" \
      -d '{"root":"status","path":"evidence/test.json","content":"{\"ok\":true}"}' \
    && curl -sS -X POST http://localhost:3037/api/open \
      -H "Content-Type: application/json" \
      -d '{"root":"status","path":"evidence/test.json"}'

---

## BT-10 Backend (FastAPI) — venv & Ports Quick Guide

- Ports
  - Bridge: 3037 (this server)
  - Backend: 8000 (uvicorn app.api:app)
- Health
  - curl -s http://127.0.0.1:8000/api/health
- One-time setup (Debian/Ubuntu)
  - sudo apt-get install -y python3-venv
  - chmod +x scripts/dev_backend.sh
  - ./scripts/dev_backend.sh init
- Run backend
  - ./scripts/dev_backend.sh run
- Freeze snapshot (evidence)
  - ./scripts/dev_backend.sh freeze
  - Writes: status/evidence/packaging/dev_backend_freeze_*.txt
- Full hygiene guide
  - status/evidence/packaging/venv_hygiene_guide_20250820.md