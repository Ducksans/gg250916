# Root Inventory — Semantic Map (BT‑13 v1, read‑only)

Purpose
- Provide a one‑screen, Obsidian‑like inventory of every root‑level path with roles, purpose, and key notes.
- Serve as the “house entrance” for newcomers and operators; no execution implied.

Legend (roles)
- C = Core/SSOT
- H = Hub/Index
- S = Static docs/specs
- D = Dynamic evidence/data
- A = API/Code surface
- UI = Frontend/UI assets
- R = Runtime/Logs/Env
- Q = Quarantine/Isolated
- X = Legacy/External

Pinned Core Anchors (always 1‑hop visible)
- `gumgang_meeting/.rules` [C,S]
- `gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md` [C,S,D]
- `gumgang_meeting/app/api.py` [C,A]
- `gumgang_meeting/status/design/memory_gate/SSOT.md` [C,S]

References
- Style guide: `status/design/sitegraph/STYLE_GUIDE.md`
- Signals: `status/design/sitegraph/SIGNALS.md`
- Ops notes: `status/notes/sitegraph_ops_v0.md`
- Sitemap v0: `status/evidence/sitemap/BT-13_sitemap_v0.md`
- Self‑Structure v0: `status/evidence/structure_report_BT-13_v0.md`
- Improvement Cards v0: `status/evidence/improvement_cards/BT-13_cards_v0.md`

Root Inventory (paths in alphabetical order)

1) `gumgang_meeting/.ropeproject` [R]
- Purpose: Editor/IDE metadata.
- Notes: Non‑authoritative; may be ignored in evidence.

2) `gumgang_meeting/.rules` [C,S]
- Purpose: v3.0 operating rules (ports, WRITE_ALLOW, append‑only, gates).
- Notes: Treat as constitution; pinned anchor.

3) `gumgang_meeting/.rules.backup.20250820_1108` [S]
- Purpose: Backup of rules prior to v3.0 adoption.
- Notes: Read‑only reference.

4) `gumgang_meeting/README.md` [H,S]
- Purpose: Root quickstart (ports, preflight, backend/bridge tips).
- Notes: Good first read for hands‑on run.

5) `gumgang_meeting/QUARANTINE/` [Q]
- Purpose: Isolated content with manifest.
- Notes: Read‑only; see `QUARANTINE/QUARANTINE.md`.

6) `gumgang_meeting/app/` [C,A]
- Purpose: FastAPI backend (BT‑10..12 features).
- Key: `app/api.py` (meetings, memory store/search/recall, gate, anchor), `app/gate_utils.py` (HMAC tokens, PII, audit).

7) `gumgang_meeting/archive_docs/` [S]
- Purpose: Archived documents (currently empty).
- Notes: Use for aging static docs.

8) `gumgang_meeting/artifacts/` [D]
- Purpose: Build or analysis artifacts.
- Notes: `.keep` present; define retention policy if used.

9) `gumgang_meeting/bridge/` [UI,A]
- Purpose: Local bridge (Node) at 3037 (serves UI, simple APIs).
- Key: `bridge/server.js`.

10) `gumgang_meeting/context_observer/` [S]
- Purpose: Token budget, session rollups, retention policy notes.
- Notes: Inputs to operations and memory curation.

11) `gumgang_meeting/conversations/` [D,R]
- Purpose: Conversation logs JSONL and session folders.
- Notes: Import conduits locked by BT‑11; house‑first.

12) `gumgang_meeting/docs/` [S]
- Purpose: Conceptual docs (SSOT 개념, 규범, UI 요구/게이트 등).
- Notes: Good domain background.

13) `gumgang_meeting/draft_docs/` [S]
- Purpose: Drafts (release checklist, 선언문, 응답 템플릿).
- Notes: Promote to docs/ when stabilized.

14) `gumgang_meeting/gumgang_0_5/` [X,S]
- Purpose: Legacy heritage (0.5). Do not import by default.
- Notes: Refer for history; follow BT‑11 IMPORT policy.

15) `gumgang_meeting/memory/` [S]
- Purpose: Memory‑related notes/logs (human‑authored).
- Notes: Authoritative memory data lives under `status/evidence/memory/*`.

16) `gumgang_meeting/obsidian_vault/` [S,X]
- Purpose: User vault; onboarding/notes.
- Notes: Optional; not a production SSOT.

17) `gumgang_meeting/projects/` [S]
- Purpose: Placeholder for sub‑projects (currently empty).
- Notes: Create subtrees with dedicated READMEs when used.

18) `gumgang_meeting/scripts/` [S,R]
- Purpose: Preflight, backend venv helper scripts.
- Key: `scripts/dev_backend.sh`, `scripts/preflight.sh`.

19) `gumgang_meeting/sessions/` [D,R]
- Purpose: Session indexes/artifacts.
- Notes: Align with conversations/ for session continuity.

20) `gumgang_meeting/status/` [C,H,S,D]
- Purpose: SSOT for checkpoints, design, evidence, logs, notes, roadmap.
- Key hubs:
  - `status/checkpoints/CKPT_72H_RUN.md` [C,S,D] — append‑only run log (pinned).
  - `status/design/` [S] — API/design/risks; includes SiteGraph style/signals.
  - `status/evidence/` [D] — memory tiers/search/recall/anchor_runs/gate; sitemap; house evidence.
  - `status/notes/` [S] — guard notes, ops runbooks.
  - `status/resources/` [S] — PII patterns, vector index logs.
  - `status/roadmap/` [S] — planning and compass.

21) `gumgang_meeting/task/` [S]
- Purpose: UI MVP gate checklist and task notes.
- Notes: Short‑form task anchors.

22) `gumgang_meeting/ui/` [UI,S,R]
- Purpose: UI snapshots/protos/overlays/tools.
- Key: `ui/snapshots/unified_A1-A4_v0/`, `ui/overlays/*`, `ui/tauri_shim_v1/`.

23) `gumgang_meeting/units/` [S]
- Purpose: Placeholder for unit modules (currently empty).
- Notes: Add per‑unit README if populated.

24) `gumgang_meeting/venv/` [R]
- Purpose: Project‑local Python venv.
- Notes: Hygiene enforced; never global pip. Excluded from evidence.

25) `gumgang_meeting/금강ui/` [S,X,UI]
- Purpose: Local Obsidian‑style wiki snippets.
- Notes: Optional; not an SSOT; useful for ideation.

Cross‑Connections (backlink style)
- Rules → governs Status/Evidence/Bridge/App operations.
- Checkpoints → read by `app/api.py` anchor endpoint and referenced across evidence runs.
- App(API) → writes evidence under `status/evidence/**` and reads resources (PII templates).
- Design(Memory Gate) → informs Gate API behavior and approval flow.
- UI snapshots → demonstrate flows; logs complement evidence.

Quick “Where do I find…?”
- “Recent memory search runs?” → `status/evidence/memory/search_runs/YYYYMMDD/*.json`
- “Meeting events for a session?” → `status/evidence/meetings/<session>/events.jsonl`
- “Approved ultra‑long (L5) gate records?” → `status/evidence/memory/gate/approved/YYYYMMDD/*.json`
- “PII patterns?” → `status/resources/memory/pii/patterns_v1.json`
- “House sitemap?” → `status/evidence/sitemap/BT-13_sitemap_v0.md`

Operational Notes
- Append‑only: `status/checkpoints/*.md` and evidence artifacts.
- SAFE/PROD parity: same evidence behavior; prod CORS forbids “*”.
- Quarantine: visible as nodes, no traversal inside by default.

Planned (BT‑14 preview; not executed here)
- SiteGraph snapshot JSON under `status/evidence/sitemap/graph_runs/YYYYMMDD/sitegraph.json`.
- A1 “House Map” with Tree/Graph/Cards and one‑click jump.

Change Log
- v1 (BT‑13): Initial root‑level semantic inventory with roles, purposes, and quick routes.
