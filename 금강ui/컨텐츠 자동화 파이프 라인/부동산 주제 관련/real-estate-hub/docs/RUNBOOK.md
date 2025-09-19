---
title: Runbook (운영/트러블슈팅 가이드)
purpose: 개발/운영 중 발생하는 이슈를 빠르게 해결하기 위한 표준 절차와 명령을 문서화합니다.
created: 2025-09-19T01:13:08+09:00
last_modified: 2025-09-19T01:13:08+09:00
maintainer: Cascade / Team GG
---

# Runbook (Operations + Troubleshooting)

한국어 요약: 개발 서버 실행/빌드/배포 및 Tailwind v4 관련 주의점, 흔한 이슈의 해결 절차를 제공합니다.

## Start/Build
```bash
npm run dev     # http://localhost:5174
npm run build   # outputs to dist/
```

## Tailwind v4 Notes
- Tailwind is enabled via PostCSS plugin in `vite.config.ts`:
  - `@tailwindcss/postcss`, `autoprefixer()`
- Theme tokens/plugins declared in `src/index.css` using `@theme`, `@plugin`, `@source`
- Editor may warn on those at-rules; they are valid in Tailwind v4.

## Common Issues
- Unstyled page
  - Restart dev server, hard-refresh
  - Confirm `vite.config.ts` has Tailwind plugin loaded
  - Confirm `src/main.tsx` imports `./index.css`
  - Try a clean build: `npm run build`
- Port 5174 busy
  - `pkill -f "vite"`
- CSS parse error after edits
  - Check `src/index.css` braces and at-rule order (`@import "tailwindcss"` must be first)

## Useful Checks
```bash
# Type check
npm run build  # runs tsc -b then vite build

# Search for mis-typed motion variants
ripgrep "variants={" src/ -n
```

## Release (manual)
- Build `npm run build`
- Serve `dist/` with any static host
