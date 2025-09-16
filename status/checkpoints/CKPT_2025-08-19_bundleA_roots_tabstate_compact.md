---
phase: past
---

# Checkpoint — 2025-08-19 Bundle A: Roots Dropdown + Per-Tab State + Compact Default

RUN_ID: CKPT_2025-08-19_bundleA_roots_tabstate_compact
DATE_UTC: 2025-08-19
SCOPE: Bridge server + Memory Inspector v0 UI (read-only)
APPEND_POLICY: Append-only (do not edit previous checkpoints; create new files for future changes)
MODE: READ_ONLY=true

## 1) Overview

Bundle A is complete. The Memory Inspector now:
- Uses a server-provided roots dropdown populated from FS_ALLOWLIST.
- Persists state per tab (T1/T2/T3) including cwd, sort, order, foldersFirst, page, pageSize, q, recursive, and rootId.
- Enables Compact mode by default and adds keyboard shortcuts.

These changes improve safety (root selection confined to allowlist), repeatability (per-tab session restore), and usability (cleaner default layout).

## 2) What changed

Bridge (read-only):
- New endpoint: GET /api/fs/roots
  - Purpose: Expose the server’s FS_ALLOWLIST to the UI.
  - Response shape:
    - { "roots": [ { "id": "ws", "path": "/absolute/path" }, ... ], "meta": { request_id, upstream_model, cache_ratio, server_ts } }
  - Security: Read-only; simply reflects the allowlist ids and paths already configured on the server.

UI: Memory Inspector v0 (snapshots/unified_A1-A4_v0/memory_inspector.html):
- Root selector:
  - Replaced free-form input with a select dropdown.
  - Populates from GET /api/fs/roots.
  - On change: resets cwd to /, clears selection, sets page=1, reloads list, persists mapping for the current tab.
- Per-tab state persistence:
  - Storage key: gg_tab_state_v1 (object keyed by T1/T2/T3).
  - Persisted fields: cwd, sort, order, foldersFirst, page, pageSize, q, recursive, rootId.
  - On tab switch: previous tab state is saved; new tab state is restored; list is reloaded to reflect restored state.
- Tab-root mapping:
  - Storage key: gg_root_map (e.g., { "T1": "ws", "T2": "gg_obs", "T3": "gg_proj" }).
  - Initial mapping can also be injected via query params: ?root_t1=ws&root_t2=gg_obs&root_t3=gg_proj (persisted to gg_root_map on first load).
- Compact default + shortcuts:
  - LocalStorage key gg_compact defaults to "true".
  - Keyboard c toggles compact mode; o toggles Orchestrator panel visibility (gg_orc_visible).
- List/read behaviors retained:
  - Sorting: name/size/mtime; order asc/desc; foldersFirst true/false.
  - Server-side pagination: page, pageSize.
  - File preview paging: 128KB pages with Prev/Next and offset tracking.

## 3) Evidence

A) Server roots endpoint observed (from browser/shell):
- GET /api/fs/roots returned roots including:
  - {"id": "ws", "path": "/home/duksan/바탕화면/gumgang_0_5"}
  - {"id": "gg_meeting", "path": "/home/duksan/바탕화면/gumgang_meeting"}
  - {"id": "gg_obs", "path": "/home/duksan/바탕화면/gumgang_meeting/obsidian_vault"}
  - {"id": "gg_proj", "path": "/home/duksan/바탕화면/gumgang_meeting/projects"}

B) UI confirmation:
- Root dropdown lists the entries from /api/fs/roots.
- Selecting “ws — /home/duksan/바탕화면/gumgang_0_5” switches the working root and reloads the listing.
- Tabs remember their own root and state; switching tabs restores state as expected.
- Compact: on by default; c/o shortcuts toggle Compact/Orchestrator states.

C) Regression checks:
- Browse list respects sort/order/foldersFirst.
- Pagination and pageSize adjust listing correctly.
- File preview chunking (128KB) works in both Prev/Next directions where file size allows.

## 4) Configuration notes

FS_ALLOWLIST must be a single-line JSON array in the project root .env:
- Path: gumgang_meeting/.env
- Example:
  FS_ALLOWLIST='[{"id":"ws","path":"/home/duksan/바탕화면/gumgang_0_5"},{"id":"gg_meeting","path":"/home/duksan/바탕화면/gumgang_meeting"},{"id":"gg_obs","path":"/home/duksan/바탕화면/gumgang_meeting/obsidian_vault"},{"id":"gg_proj","path":"/home/duksan/바탕화면/gumgang_meeting/projects"}]'
- Important:
  - process.env overrides .env. If you previously exported FS_ALLOWLIST in your shell, unset it or run with env -u FS_ALLOWLIST node bridge/server.js so .env takes effect.
  - Restart the bridge after editing .env to reload FS_ALLOWLIST.

## 5) How to run and test

- Start the bridge:
  - node bridge/server.js
  - Default port: 3037
- Verify roots:
  - http://localhost:3037/api/fs/roots
- Open Memory Inspector:
  - http://localhost:3037/ui/snapshots/unified_A1-A4_v0/memory_inspector.html
  - Optionally seed tab roots via query:
    - .../memory_inspector.html?root_t1=ws&root_t2=gg_obs&root_t3=gg_proj

Smoke tests:
- Select each root from dropdown; ensure listing updates and cwd resets.
- For each tab, change some state (cwd, search, sort, pagination), switch tabs, and return; confirm restoration.
- Toggle Compact (c) and Orchestrator panel (o); ensure settings persist.

## 6) Known limitations and notes

- The roots dropdown is strictly sourced from FS_ALLOWLIST; ad-hoc paths are intentionally not permitted for safety and consistency with server policy.
- The .env parser is line-based; multi-line JSON values are not supported. Keep FS_ALLOWLIST on a single line.
- If FS_ALLOWLIST is empty/invalid, the UI falls back to the current input value but may provide a degraded experience (limited or no root options).

## 7) Next steps (Bundle B candidates)

- Bookmarks/Tags/Notes:
  - Client-only initially; export/import JSON for collaboration.
  - Visual badges/tags in list and sticky summary in preview.
- Preview page jump:
  - Direct offset/page-number input with validation and range feedback.
- Loading/performance indicators:
  - Subtle status for list and read calls, including bytes read and elapsed time.
- UX polish:
  - Root dropdown: widen, show id in label with full path in tooltip.
  - Remember per-tab model selection.
  - Optional quick filter chips (e.g., size>1MB, recently-edited).

## 8) Rollback plan

- Bridge: remove or guard /api/fs/roots endpoint if needed (feature flag).
- UI: revert root input to a free-form field by bypassing dropdown replacement logic.
- LocalStorage cleanup: clear gg_tab_state_v1, gg_root_map, gg_compact, gg_orc_visible if state persistence causes confusion.

## 9) Handoff summary

- Server provides read-only roots at /api/fs/roots reflecting FS_ALLOWLIST.
- UI consumes that list, enforces tab-level root mapping and state persistence, defaults to compact mode, and adds helpful shortcuts.
- Current milestone is stable; ready to proceed to Bundle B UX features.
