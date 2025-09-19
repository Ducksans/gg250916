---
title: Real Estate Hub – Frontend
purpose: Project overview and setup guide for the React + TS + Vite + Tailwind v4 frontend.
created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
last_modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
maintainer: Team GG
---

# Real Estate Hub – Frontend (React + TypeScript + Vite + Tailwind v4)

본 프로젝트는 부동산 컨텐츠 허브의 랜딩/정보 구조를 구현하는 React 프론트엔드입니다. Tailwind CSS v4를 사용하며, 개발 서버는 포트 5174로 동작합니다.

## Tech Stack

- React 18, TypeScript
- Vite 7 (dev server: 5174)
- Tailwind CSS v4 (+ typography/forms/aspect-ratio)
- PostCSS with `@tailwindcss/postcss` and `autoprefixer`
- Framer Motion, lucide-react

## Entry Points

- 앱 엔트리: `src/main.tsx`
  - 글로벌 스타일: `src/index.css` (Tailwind v4 토큰/플러그인 선언 포함)
  - 루트 컴포넌트: `src/App.tsx`
- 주요 UI 컴포넌트
  - 헤더: `src/components/Header.tsx` (sticky 상단 내비게이션)
  - 히어로: `src/components/HeroSection.tsx` (1920×1080 기준 정보 밀도 튜닝 완료)
  - 각 섹션: `src/components/` 내부 다수 컴포넌트

## Getting Started

1) 의존성 설치
```
npm install
```

2) 개발 서버 실행 (포트 5174)
```
npm run dev
```
브라우저에서 http://localhost:5174 접속

3) 프로덕션 빌드
```
npm run build
```
빌드 아웃풋은 `dist/`

## Tailwind v4 구성 요약

- `vite.config.ts`
  - Vite에 PostCSS 플러그인 수동 주입
  - `@tailwindcss/postcss`와 `autoprefixer()`를 `css.postcss.plugins` 배열에 등록
- `tailwind.config.js`
  - ESM 방식(import)으로 플러그인 등록: `@tailwindcss/typography`, `forms`, `aspect-ratio`
- `src/index.css`
  - 최상단 `@import "tailwindcss";`
  - v4 전용 지시어 사용: `@plugin`, `@source`, `@theme`
  - `@theme`로 브랜드/프라이머리/세맨틱/보더 토큰 정의
  - `@layer base/components/utilities`에 공통 스타일과 유틸리티 확장

중요: 에디터가 `@plugin`, `@source`, `@theme`를 알 수 없어 경고할 수 있지만, Tailwind v4 파이프라인에서 정상 처리됩니다.

## 개발 중 해결된 이슈

- Tailwind 지시어가 처리되지 않아 UI가 기본 텍스트로 보이는 문제
  - 원인: PostCSS 파이프라인에 Tailwind v4 플러그인이 반영되지 않음
  - 조치: `vite.config.ts`에 플러그인 명시 주입, `tailwind.config.js` ESM 전환
- dev/HMR 상태 불안정으로 스타일 반영 누락
  - 조치: dev 서버 재시작, 필요 시 프로덕션 빌드로 정상성 확인
- CSS 파싱 오류로 스타일 붕괴 (여분의 `}`)
  - 조치: `src/index.css` 문법 오류 수정
- 레이아웃 스크롤 고정 현상
  - 원인: 헤더 내부에 히어로 블록 포함 + `sticky`
  - 조치: 헤더는 내비게이션만 유지, 히어로는 별도 `HeroSection.tsx`로 분리

## 스크립트

- 개발: `npm run dev`
- 빌드: `npm run build`

## 디렉터리 구조 (요약)

```
real-estate-hub/
├─ index.html
├─ vite.config.ts
├─ tailwind.config.js
├─ postcss.config.js
├─ src/
│  ├─ main.tsx            # 엔트리
│  ├─ App.tsx             # 루트 컴포넌트
│  ├─ index.css           # Tailwind v4 토큰 및 레이어 정의
│  └─ components/         # Header, Hero, 섹션 컴포넌트들
└─ dist/                  # 빌드 결과
```

## 트러블슈팅 체크리스트

- 화면이 기본 텍스트처럼 보일 때
  - dev 서버 재시작 후 강력 새로고침(Ctrl+F5)
  - `vite.config.ts`의 `css.postcss.plugins`에 `@tailwindcss/postcss`, `autoprefixer()`가 존재하는지 확인
  - `src/main.tsx`가 `./index.css`를 import하는지 확인
  - 프로덕션 빌드로 검증: `npm run build`
- 포트 충돌(5174)
  - 기존 vite 프로세스 종료: `pkill -f "vite"`

## 진행 현황

- Tailwind v4 파이프라인 정상화, ESM 전환 완료
- 레이아웃 스크롤/밀도 이슈 수정 (1920×1080 기준 가독성 향상)
- 다음 작업: 헤더/탭/검색 바 및 카드/뱃지 전반을 벤치마크 수준으로 추가 폴리시, 성능/접근성 점검

---

문의/요청 사항은 이 README 최하단에 TODO 형태로 추가하거나, `components/` 내 섹션 파일에 주석으로 남겨 주세요.
