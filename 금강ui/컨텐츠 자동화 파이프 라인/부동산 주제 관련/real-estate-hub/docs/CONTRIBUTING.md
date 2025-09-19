---
title: Contributing Guide
purpose: Branching, commit conventions, code style, PR checklist, and handoff rituals.
created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
last_modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
maintainer: Team GG
---

# Contributing

## Branching
- `main` protected
- Feature branches: `feat/<scope>`; fixes: `fix/<scope>`

## Commits
- Conventional Commits
  - `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`

## Code Style
- TypeScript strict by build
- ESLint/Prettier (if added later); keep imports ordered; no unused imports

## PR Checklist
- [ ] Builds locally (`npm run build`)
- [ ] Visual check in browser
- [ ] Updated docs (STATUS_LOG / DECISIONS)

## Handoff
- Update `docs/STATUS_LOG.md` with What/Why/Next
