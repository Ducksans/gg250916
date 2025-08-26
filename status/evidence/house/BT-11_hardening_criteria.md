# BT-11 — House Hardening Checklist and PASS Criteria
Status: active
Owner: Gumgang (AI)
SSOT: status/checkpoints/CKPT_72H_RUN.md
Policy: .rules v3.0 (House first, Conduits locked; IMPORT_ENABLED=false; append-only evidence)

1) Purpose
- Stabilize the “House” (core UI + bridge + backend) before any imports.
- Verify health, badges, error panels, runtime logs, and SAFE/NORMAL parity.
- Record objective Evidence under status/evidence/** and checkpoints in SSOT.

2) Scope
- Backend: FastAPI app at port 8000 (uvicorn app.api:app).
- Bridge: Node bridge at port 3037 (/api/save, /api/open, /api/health, /ui/*).
- UI: snapshots/unified_A1-A4_v0 (A1 chat, A2 session, A3 tools, A4 status/logs, A5 meetings).
- Storage: status/evidence/** (append-only); meetings events/attachments under status/evidence/meetings/<session>/.

3) Preconditions
- Ports fixed per .rules v3.0: backend 8000, bridge 3037.
- SSOT file exists and is append-only: status/checkpoints/CKPT_72H_RUN.md.
- Conduits defined and locked (no import): conversations/imported/, status/evidence/import_index/, artifacts/.
- PII_STRICT=true; QUARANTINE/ available.

4) Signals to Verify (Checklist)
A. Backend Health
- [ ] GET http://127.0.0.1:8000/api/health returns 200 with ok:true
- [ ] routes include capture, annotate, record_start, record_stop, events_read
- Evidence:
  - status/evidence/house/backend_health_<date>_<mode>.json
  - Reference: app/api.py (health endpoint and routes)

B. Bridge Health
- [ ] GET http://127.0.0.1:3037/api/health returns 200 with ok:true and routes {save, open, ui, fs_*}
- [ ] GET http://127.0.0.1:3037/health returns 200 with ok:true
- Evidence:
  - status/evidence/house/bridge_health_<date>.json
  - Reference: bridge/server.js (/health, /api/health)

C. UI Badges and Warn Bars
- [ ] Backend badge shows OK when backend reachable; OFF on failure
- [ ] Tab badges (WARN/ERROR) render and clear appropriately
- [ ] Warn bars (global/panel) appear on simulated error, then hide after recovery
- Evidence:
  - status/evidence/house/ui_badges_probe_<date>_<mode>.json
  - status/evidence/house/warnbar_probe_<date>_<mode>.json
  - Reference: ui/snapshots/unified_A1-A4_v0/index.html (badges, warnbar behavior)

D. A4 Status/Logs + Runtime Log Writing
- [ ] A4 panel renders and shows recent log summaries
- [ ] UI runtime JSONL is written under status/evidence/ui_runtime_YYYYMMDD_<session>.jsonl via bridge /api/save
- Evidence:
  - status/evidence/ui_runtime_YYYYMMDD_<session>.jsonl
  - status/evidence/house/a4_log_probe_<date>_<mode>.json
  - Reference: ui/snapshots/unified_A1-A4_v0/index.html (runtime log writer)

E. A5 Meeting Actions and Event Store
- [ ] Capture (JSON) → event type “capture” appended
- [ ] Annotate → event type “annotate” appended
- [ ] Record start/stop → marker files recording.started.json / recording.stopped.json; events appended
- [ ] Upload (FormData) → attachment saved under status/evidence/meetings/<session>/attachments/
- [ ] events.jsonl tail includes performed actions in chronological order
- Evidence:
  - status/evidence/meetings/<session>/events.jsonl
  - status/evidence/meetings/<session>/attachments/<ts>_<name>
  - status/evidence/house/a5_actions_probe_<date>_<mode>.json
  - Reference: app/api.py (meetings endpoints)

F. Recording Badge Sync (A1/A5)
- [ ] Toggling record updates UI badge text to ON/OFF consistently across A1 and A5
- [ ] Sync function reflects server record/status after debounce
- Evidence:
  - status/evidence/house/record_sync_probe_<date>_<mode>.json

G. SAFE/NORMAL Parity
- [ ] Same scenario in SAFE vs NORMAL yields identical event schema and semantics; only “mode” differs
- [ ] Badges/warn bars timing comparable (within reasonable delay)
- Evidence:
  - status/evidence/house/parity_diff_<date>.md (diff or summary)
  - status/evidence/house/parity_matrix_<date>.json

H. Conduits Locked
- [ ] conversations/imported/<pkg_id>/ contains only stubs or reports (no raw payload)
- [ ] status/evidence/import_index/<pkg_id>/* contains dry-run reports only
- [ ] artifacts/<date>/*.json not duplicating raw content
- Evidence:
  - status/evidence/conduits_README.md
  - directory listings captured to status/evidence/house/conduits_listing_<date>.txt

I. SSOT Cadence and Guards
- [ ] Checkpoints appended for start, transitions, ≤90min cadence, and pass/fail decisions
- [ ] No edits-in-place violations of append-only files
- Evidence:
  - status/checkpoints/CKPT_72H_RUN.md (lines for BT-11 STs)
  - status/evidence/tools_probe/* if applicable

5) Test Matrix (per mode: SAFE then NORMAL)
For each mode:
- [ ] Backend health probe (A)
- [ ] Bridge health probe (B)
- [ ] UI badges and warn bars (C)
- [ ] A4 status/logs write/read (D)
- [ ] A5 capture/annotate/upload + record start/stop (E)
- [ ] Recording badge sync (F)
- [ ] Snapshot parity capture (G)

6) PASS Criteria (BT-11 House Hardening)
Declare BT-11 House Hardening PASS if ALL conditions hold:
- [ ] A, B: Both health endpoints OK; UI backend badge reflects status correctly
- [ ] C: Badges and warn bars render/clear as expected in both modes
- [ ] D: Runtime JSONL present under status/evidence with fresh entries for the session
- [ ] E: Events appended with correct types; upload saved; markers created on record start/stop
- [ ] F: Recording badge synchronized across A1/A5; server status reflects UI toggle
- [ ] G: SAFE/NORMAL parity confirmed (schema equal, semantics equal; mode tag differs)
- [ ] H: Conduits remain locked; no raw import occurred; README present
- [ ] I: SSOT checkpoints appended for ST-1101..1106 with Evidence links

7) PARTIAL Criteria
Mark PARTIAL (remediation required) if:
- Any single area fails but is transient; clear fix is documented and evidence shows improvement plan
- Conduits lock or SSOT cadence violated → NOT partial; treat as FAIL

8) FAIL Criteria
Mark FAIL if any of the following:
- Health endpoint(s) unreliable or UI badges do not reflect backend state
- Runtime logs not being written or A4 panel nonfunctional
- SAFE/NORMAL parity breaks (missing fields, divergent semantics)
- Conduits lock violated (any raw import/mutation without checkpoint)
- SSOT not maintained per cadence

9) Remediation Playbook (quick)
- Backend/Badge: check /api/health and CORS; ensure UI fetch targets 127.0.0.1:8000; add retry/toast
- Runtime Logs: verify bridge /api/save reachable; ensure path under status/ and relative
- Parity: diff events.jsonl SAFE vs NORMAL; harmonize UI codepaths; ensure mode injection only
- Conduits: revert and QUARANTINE any accidental imports; log checkpoint with reason
- SSOT: append corrective checkpoint with root cause and guard notes

10) Evidence Filing
Create or update the following per run (append-only):
- status/evidence/house/backend_health_<date>_<mode>.json
- status/evidence/house/bridge_health_<date>.json
- status/evidence/house/ui_badges_probe_<date>_<mode>.json
- status/evidence/house/warnbar_probe_<date>_<mode>.json
- status/evidence/house/a4_log_probe_<date>_<mode>.json
- status/evidence/house/a5_actions_probe_<date>_<mode>.json
- status/evidence/house/record_sync_probe_<date>_<mode>.json
- status/evidence/house/parity_diff_<date>.md
- status/evidence/house/parity_matrix_<date>.json
- status/evidence/house/conduits_listing_<date>.txt

11) Sign-off (fill on completion; append-only)
Run ID: 72H_YYYYMMDD_HHMMZ
Date (UTC): YYYY-MM-DDTHH:MM:SSZ
Session ID: GG-SESS-LOCAL (or other)

Results (SAFE / NORMAL):
- Backend Health: OK / OK
- Bridge Health: OK / OK
- UI Badges/Warn Bars: OK / OK
- A4 Status/Logs: OK / OK
- A5 Actions Store: OK / OK
- Recording Sync: OK / OK
- Parity: PASS
- Conduits Lock: OK
- SSOT Cadence: OK

Decision:
- [ ] BT-11 House Hardening PASS
- [ ] PARTIAL (remediate)
- [ ] FAIL (rollback to previous stable; record evidence bundle)

Notes:
- …

12) References
- .rules v3.0 (Ports/Entrypoints, BT-11 Declaration, Non‑negotiables)
- app/api.py (health and meeting endpoints)
- bridge/server.js (health, save/open, UI static)
- ui/snapshots/unified_A1-A4_v0/index.html (badges, warn bars, A4, A5 wiring)