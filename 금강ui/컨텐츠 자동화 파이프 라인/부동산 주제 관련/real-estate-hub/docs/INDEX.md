---
title: Repository Index
purpose: Comprehensive index of code, config, and documentation with metadata presence and quick purpose notes.
created: 2025-09-18T17:40:37Z (2025-09-19 02:40 KST)
last_modified: 2025-09-18T17:40:37Z (2025-09-19 02:40 KST)
maintainer: Team GG
---

# Repository Index

본 문서는 `real-estate-hub/`의 파일을 한눈에 볼 수 있도록 정리한 색인입니다. `node_modules/`, `dist/`는 제외합니다.

표기 규칙
- Header: 메타데이터 헤더 유무. JSON 등 주석 불가 형식은 "n/a (JSON)"로 표기
- Type: code | config | doc | asset | html
- Maintainer: Team GG (기본)

## Root
- `README.md` — Type: doc — Header: yes — Purpose: 프로젝트 개요 및 실행 가이드 — Maintainer: Team GG
- `.gitignore` — Type: config — Header: no — Purpose: Git 무시 규칙 — Maintainer: Team GG
- `index.html` — Type: html — Header: yes — Purpose: 앱 루트 HTML — Maintainer: Team GG
- `eslint.config.js` — Type: config — Header: yes — Purpose: ESLint 설정 — Maintainer: Team GG
- `postcss.config.js` — Type: config — Header: yes — Purpose: PostCSS/Tailwind v4 플러그인 등록 — Maintainer: Team GG
- `tailwind.config.js` — Type: config — Header: yes — Purpose: Tailwind v4 토큰/플러그인 — Maintainer: Team GG
- `vite.config.ts` — Type: config — Header: yes — Purpose: Vite 설정 + PostCSS 플러그인 — Maintainer: Team GG
- `example.env` — Type: config — Header: yes — Purpose: 환경변수 샘플 — Maintainer: Team GG
- `package.json` — Type: config — Header: n/a (JSON) — Purpose: 의존성/스크립트 — Maintainer: Team GG
- `package-lock.json` — Type: config — Header: n/a (JSON) — Purpose: 잠금 파일 — Maintainer: Team GG
- `tsconfig.json` — Type: config — Header: n/a (JSON) — Purpose: TS 루트 설정 — Maintainer: Team GG
- `tsconfig.app.json` — Type: config — Header: n/a (JSON) — Purpose: TS 앱 설정 — Maintainer: Team GG
- `tsconfig.node.json` — Type: config — Header: n/a (JSON) — Purpose: TS 노드 설정 — Maintainer: Team GG

## Public/
- `public/vite.svg` — Type: asset — Header: n/a (asset) — Purpose: 파비콘/로고 — Maintainer: Team GG

## src/
- `src/main.tsx` — Type: code — Header: yes — Purpose: 앱 엔트리 — Maintainer: Team GG
- `src/App.tsx` — Type: code — Header: yes — Purpose: 페이지 합성 루트 — Maintainer: Team GG
- `src/index.css` — Type: code — Header: yes — Purpose: Tailwind v4 지시어/토큰/레이어 — Maintainer: Team GG
- `src/App.css` — Type: code — Header: yes — Purpose: 전역 보조 스타일 — Maintainer: Team GG
- `src/vite-env.d.ts` — Type: code — Header: yes — Purpose: Vite 타입 선언 — Maintainer: Team GG
- `src/assets/react.svg` — Type: asset — Header: n/a (asset) — Purpose: 아이콘 — Maintainer: Team GG

### src/components/
- `src/components/Header.tsx` — Type: code — Header: yes — Purpose: 상단 내비게이션 — Maintainer: Team GG
- `src/components/HeroSection.tsx` — Type: code — Header: yes — Purpose: 히어로 섹션 — Maintainer: Team GG
- `src/components/ValueProposition.tsx` — Type: code — Header: yes — Purpose: 가치 제안 — Maintainer: Team GG
- `src/components/AutomationFlow.tsx` — Type: code — Header: yes — Purpose: 자동화 플로우 — Maintainer: Team GG
- `src/components/GrowthLoop.tsx` — Type: code — Header: yes — Purpose: 그로스 루프 — Maintainer: Team GG
- `src/components/PricingSection.tsx` — Type: code — Header: yes — Purpose: 가격 섹션 — Maintainer: Team GG
- `src/components/CoreThemes.tsx` — Type: code — Header: yes — Purpose: 코어 테마 — Maintainer: Team GG
- `src/components/InformationArchitecture.tsx` — Type: code — Header: yes — Purpose: 정보 구조 — Maintainer: Team GG
- `src/components/AutomationPipeline.tsx` — Type: code — Header: yes — Purpose: 자동화 파이프라인 — Maintainer: Team GG
- `src/components/Compliance.tsx` — Type: code — Header: yes — Purpose: 컴플라이언스 — Maintainer: Team GG
- `src/components/Milestones.tsx` — Type: code — Header: yes — Purpose: 제품 마일스톤 — Maintainer: Team GG
- `src/components/MobileApps.tsx` — Type: code — Header: yes — Purpose: 모바일 기능 테이블 — Maintainer: Team GG
- `src/components/Footer.tsx` — Type: code — Header: yes — Purpose: 푸터/정책/브랜딩 — Maintainer: Team GG

## docs/
- `docs/INDEX.md` — Type: doc — Header: yes — Purpose: 저장소 색인(본 문서) — Maintainer: Team GG
- `docs/README.md` — 없음
- `docs/ARCHITECTURE.md` — Type: doc — Header: yes — Purpose: 아키텍처 개요 — Maintainer: Team GG
- `docs/ONBOARDING.md` — Type: doc — Header: yes — Purpose: 온보딩 가이드 — Maintainer: Team GG
- `docs/RUNBOOK.md` — Type: doc — Header: yes — Purpose: 운영/트러블슈팅 — Maintainer: Team GG
- `docs/CONTRIBUTING.md` — Type: doc — Header: yes — Purpose: 기여 가이드 — Maintainer: Team GG
- `docs/DECISIONS.md` — Type: doc — Header: yes — Purpose: ADR 요약 — Maintainer: Team GG
- `docs/STATUS_LOG.md` — Type: doc — Header: yes — Purpose: 상태 로그 — Maintainer: Team GG

## Notes
- JSON 형식 파일(tsconfig*, package*.json)은 주석을 허용하지 않으므로 메타 헤더를 추가하지 않았습니다.
- `dist/` 및 `node_modules/`는 인덱스에서 제외했습니다.
- 메타데이터 규약: UTC 기본, 괄호에 KST 병기. Maintainer 기본값은 Team GG.
