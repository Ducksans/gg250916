---
title: Decisions (ADRs – short form)
purpose: Record key architectural/product decisions with concise rationale and date.
created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
last_modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
maintainer: Team GG
---

# Decisions (ADRs – short form)

- 2025-09-19 – Tailwind v4 adoption with PostCSS plugin inline in Vite
  - Why: ensure directives (@theme/@plugin/@source) are processed reliably
- 2025-09-19 – Header keeps only nav; hero lives in separate component
  - Why: avoid sticky hero and scrolling anomalies
- 2025-09-19 – Container width via raw CSS, not unknown Tailwind utility
  - Why: avoid unknown utility aborting CSS in dev
