---
phase: present
---

# Core PR Guide — Dev Root Redirect and CI Flow

Scope: Prepare a PR in `exports/gumgang_meeting_core` for the dev root redirect change.

Changed file:
- `ui/dev_a1_vite/vite.config.ts` — add dev middleware to redirect `/` -> `/ui-dev/`.

Branching suggestion:
1) Move to core repo
   - `cd exports/gumgang_meeting_core`
2) Create branch
   - `git switch -c feat/dev-redirect-root-to-ui-dev`
3) Stage and commit
   - `git add ui/dev_a1_vite/vite.config.ts`
   - `git commit -m "dev: redirect / -> /ui-dev/ in vite dev server"`
4) Push and open PR
   - `git push -u origin HEAD`
   - Open GitHub and create PR to `main`.

Notes:
- The change only affects dev server; production build output is unchanged.
- CI (`.github/workflows/ui-guard-build.yml`) already sets `VITE_BASE=/ui-dev/`, so behavior stays consistent.

