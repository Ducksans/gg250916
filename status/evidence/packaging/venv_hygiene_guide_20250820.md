# Venv Hygiene & Packaging Guide (BT-10)
UTC_TS: 2025-08-20T08:09:00Z
Scope: Backend runtime reproducibility and environment hygiene
Project: gumgang_meeting

Summary
- Goal: keep Python environments clean, reproducible, and non-invasive (no system pollution).
- Strategy: project-local virtual environment (venv) + scripted lifecycle + evidence snapshots.
- Ports & Entrypoints (from .rules v3.0):
  - Backend: uvicorn app.api:app --port 8000
  - Bridge: node bridge/server.js on 3037 (serves /ui/, /api/save, /api/open, /api/health)

Non‑Negotiables (rules v3.0)
- Write under project only; append-only in status/checkpoints/*.md
- Do not commit venv/ or any caches; avoid global pip installs (PEP 668)
- Evidence-first: record snapshots in status/evidence/*

1) Standard venv layout (single venv at project root)
- Path: <project>/venv
- Rationale: avoid nested envs (e.g., gumgang_0_5/**) and prevent duplication.
- Ignore: ensure venv/ is ignored by VCS.

2) Create and initialize venv (Debian/Ubuntu)
    sudo apt-get update && sudo apt-get install -y python3-venv
    cd /home/duksan/바탕화면/gumgang_meeting
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel
    pip install "fastapi>=0.110" "uvicorn[standard]>=0.23" "python-multipart>=0.0.9"

Why python-multipart? Required for file uploads in app/api.py (UploadFile/Form).

3) Run backend (FastAPI/uvicorn)
Option A (venv active):
    uvicorn app.api:app --host 127.0.0.1 --port 8000

Option B (without activating):
    /home/duksan/바탕화면/gumgang_meeting/venv/bin/python -m uvicorn app.api:app \
      --app-dir /home/duksan/바탕화면/gumgang_meeting --host 127.0.0.1 --port 8000

Health check:
    curl -s http://127.0.0.1:8000/api/health

4) Helper script (recommended)
Path: scripts/dev_backend.sh
Usage (no auto-start; explicit commands only):
    chmod +x scripts/dev_backend.sh
    ./scripts/dev_backend.sh init         # create venv + install deps
    ./scripts/dev_backend.sh run          # run backend (HOST, PORT overridable)
    ./scripts/dev_backend.sh health       # curl /api/health
    ./scripts/dev_backend.sh freeze       # write pip freeze + runtime snapshot
    ./scripts/dev_backend.sh env          # print important paths and env

Env overrides:
    HOST=0.0.0.0 PORT=8000 RELOAD=1 ./scripts/dev_backend.sh run

5) Evidence snapshots (reproducibility)
Freeze snapshot (auto by script):
- Location: status/evidence/packaging/dev_backend_freeze_<UTCSTAMP>.txt
- Contains:
  - UTC timestamp, python/uvicorn versions
  - pip freeze
  - resolved paths (ROOT_DIR, APP_DIR, ENV_FILE, HOST, PORT)

Manual snapshot (if needed):
    mkdir -p status/evidence/packaging
    {
      echo "UTC_TS: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      /home/duksan/바탕화면/gumgang_meeting/venv/bin/python -V
      /home/duksan/바탕화면/gumgang_meeting/venv/bin/python -m uvicorn --version || true
      /home/duksan/바탕화면/gumgang_meeting/venv/bin/pip freeze
    } > status/evidence/packaging/manual_freeze_$(date -u +%Y%m%d_%H%M%SZ).txt

6) Alternatives (PEP 668 friendly)
- pipx (isolated, system-managed):
    sudo apt-get install -y pipx
    pipx install "uvicorn[standard]"
    pipx run uvicorn app.api:app --app-dir /home/duksan/바탕화면/gumgang_meeting --host 127.0.0.1 --port 8000

- Debian packages (if available):
    sudo apt-get install -y python3-uvicorn python3-fastapi python3-multipart

7) Hygiene rules (to avoid past “nested/dirty envs”)
- Only one venv under project root. Do not create venv inside gumgang_0_5/** or submodules.
- Never use system pip without virtualenv (avoid --break-system-packages).
- Document every environment change with a freeze snapshot (scripts/dev_backend.sh freeze).
- Keep ports fixed (backend:8000, bridge:3037). If changed, record a checkpoint entry.
- Do not commit venv/, __pycache__/, .cache/, dist/, build/ (see .rules DENY_GLOBS).
- Prefer scripts over ad-hoc commands; scripts live under scripts/.

8) Troubleshooting
Externally-managed environment (PEP 668):
- Symptom: “error: externally-managed-environment”
- Fix: use venv (section 2) or pipx; do not install system-wide with pip.

Command not found: uvicorn
- Use module form from venv: /path/to/venv/bin/python -m uvicorn ...
- Or run scripts/dev_backend.sh run

Port already in use (8000)
- Find/stop the process or run with another port, but record the override:
    PORT=8010 ./scripts/dev_backend.sh run
- Add a checkpoint entry citing reason and duration.

9) Evidence locations (this run)
- This guide: status/evidence/packaging/venv_hygiene_guide_20250820.md
- Freeze snapshots: status/evidence/packaging/dev_backend_freeze_*.txt
- Backend events (BT-10): status/evidence/meetings/<MEETING_ID>/events.jsonl
- Checkpoints (SSOT): status/checkpoints/CKPT_72H_RUN.md

10) Repro checklist (copy/paste)
    cd /home/duksan/바탕화면/gumgang_meeting
    ./scripts/dev_backend.sh init
    ./scripts/dev_backend.sh run
    ./scripts/dev_backend.sh health
    ./scripts/dev_backend.sh freeze
    # Open UI via bridge: http://localhost:3037/ui/
    # A5/A1 meeting buttons now POST to backend on 127.0.0.1:8000

11) Notes for packaging (forward-looking)
- Keep runtime and UI overlays independent: UI served by bridge (3037), backend on 8000.
- When producing distributables, prefer:
  - Preflight script (deps check)
  - Frozen env manifest (pip freeze + python version)
  - Ports/entrypoints documented in release notes
- Never bundle site-packages into the repo; use install steps or wheels in CI.

— End of venv hygiene & packaging guide.