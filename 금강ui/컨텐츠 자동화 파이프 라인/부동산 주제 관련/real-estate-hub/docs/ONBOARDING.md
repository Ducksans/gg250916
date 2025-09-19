---
title: Onboarding Guide (온보딩 가이드)
purpose: 신입/복귀 기여자가 10–15분 안에 실행 및 개발에 착수하도록 돕습니다.
created: 2025-09-19T01:13:08+09:00
last_modified: 2025-09-19T01:13:08+09:00
maintainer: Cascade / Team GG
---

# Onboarding Guide

This short guide helps any contributor get productive within 10–15 minutes.

## 요약 (KOR)
- 로컬 실행까지 10–15분 안에 완료하도록 단계별 안내를 제공합니다.
- 필수 진입점과 문서, 일일 작업 흐름, 핸드오프 체크리스트를 포함합니다.

## 1) Prerequisites
- Node.js 20.x (use `.nvmrc` if present)
- npm 10+
- Ports: dev server uses 5174

## 2) Quick Start
```bash
npm install
npm run dev
# open http://localhost:5174
```

If styles look unstyled, see Troubleshooting in RUNBOOK.md.

스타일이 적용되지 않으면 `docs/RUNBOOK.md` 트러블슈팅 섹션을 먼저 확인하세요.

## 3) Project Map
- Entry: `src/main.tsx`
- Root: `src/App.tsx`
- Global styles & Tailwind v4: `src/index.css`
- Tailwind config (ESM): `tailwind.config.js`
- Vite + PostCSS pipeline: `vite.config.ts`
- Sections: `src/components/`

프로젝트 맵(한글)
- 진입점: `src/main.tsx`
- 루트 컴포넌트: `src/App.tsx`
- 글로벌 스타일/Tailwind v4: `src/index.css`
- Tailwind 설정(ESM): `tailwind.config.js`
- Vite+PostCSS 파이프라인: `vite.config.ts`
- 섹션 컴포넌트: `src/components/`

## 4) Daily Workflow
- Create a branch from `main`: `feat/<scope>` or `fix/<scope>`
- Commit with conventional commits (see CONTRIBUTING.md)
- Open a PR; ensure CI checks pass (build/lint/tsc)

일일 워크플로우(한글)
- `main`에서 브랜치 생성: `feat/<주제>` 또는 `fix/<주제>`
- 커밋은 Conventional Commits 규칙 사용
- PR 생성 후 로컬 빌드/검수 통과 확인

## 5) Handoff Ritual (end of day)
- Update `docs/STATUS_LOG.md` (What changed, Why, Next)
- If you decided something, add/append to `docs/DECISIONS.md`
- If you hit an issue, add a short note to `docs/RUNBOOK.md` (fix recipe)

## 6) Benchmarks/Design
- Keep UI decisions in `docs/ARCHITECTURE.md` under “UI System”
- Add screenshots/links for references

핸드오프 체크(한글)
- `docs/STATUS_LOG.md` 상단에 4줄(What/Why/Next/Risks) 기록 후 종료
- 의사결정은 `docs/DECISIONS.md`에 1–3줄로 요약 추가
- 이슈/해결법은 `docs/RUNBOOK.md`에 짧게 기록
