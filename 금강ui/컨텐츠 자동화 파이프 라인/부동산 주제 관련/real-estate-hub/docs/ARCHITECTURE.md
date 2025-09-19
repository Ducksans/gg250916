---
title: Architecture Overview (아키텍처 개요)
purpose: 애플리케이션 구조/스타일 시스템/모션/디렉터리와 디자인 원칙을 요약합니다.
created: 2025-09-19T01:13:08+09:00
last_modified: 2025-09-19T01:13:08+09:00
maintainer: Cascade / Team GG
---

# Architecture Overview

## App Shell
- React + Vite
- `Header` (sticky), `HeroSection`, and multiple content sections mounted in `App.tsx`

## Styling System
- Tailwind v4 with custom tokens in `src/index.css` under `@theme`
- Component utilities in `@layer components` (e.g., `.btn`, `.card`)
- Layout container width customized in CSS for 1920×1080 density

## Motion
- Framer Motion for entrances/hover micro-interactions

## Directory Layout
```
src/
  main.tsx        # entry
  App.tsx         # page composition
  index.css       # Tailwind v4 directives, tokens, layers
  components/     # UI sections
```

## Design System (WIP)
- Type scale: hero (lg) → body (sm/md)
- Spacing rhythm: 48–64px between sections
- Cards: 3–4 columns at 1920, reduced paddings for density

## Decisions Log Pointer
- See `docs/DECISIONS.md` for ADRs
