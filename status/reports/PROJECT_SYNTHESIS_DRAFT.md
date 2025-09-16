---
phase: past
---

#+ 금강 프로젝트 — 종합 보고서 초안 (Draft)

목표: 프로젝트 전반을 충분히 이해하고, 비전/현황/과제를 정리하여 최종 보고서의 기반을 마련합니다.

구성:
- 이해 요약
- 비전
- 현재 상태
- 해야 할 일(Backlog)
- UI 현대화(A1 → dev_a1_vite) 마이그레이션 계획
- 리스크와 수용 기준
- 다음 단계

(본 문서는 단계별로 갱신됩니다.)

## 이해 요약
- SSOT 체계: 궁극적 기준은 `docs/**`(변경 불가 레퍼런스), 운영 SSOT 3종은 로드맵(`status/roadmap/BT11_to_BT21_Compass_ko.md`), 아키텍처(`status/reports/forensic_report_v1.md`), 복구 계획(`status/restore/UI_RESTORE_SSOT.md`).
- 운영 원칙: `.rules`에 명시된 복명복창/증거우선/경계준수, CKPT append-only(API) 적용.
- UI 방향: 모놀리식 `ui/snapshots/unified_A1-A4_v0/index.html`에서 `ui/dev_a1_vite`(Vite+React+Tauri)로 컴포넌트/상태 분리, ST-1206 UI 가드레일 충족.
- 레퍼런스: `LibreChat/**`의 컴포넌트 구조·상태 흐름·UX 패턴을 학습하여 적용.

## 비전
- 금강: “증거에 기반해 스스로 실행하고 회복하는” 초지능 코딩 동반자.
- UX: 채팅은 Playbook Runner. 단계(계획→증거→도구→검증→요약)를 투명하게 표시하고, 실패 시 리커버리 경로를 제안.
- 데이터: Memory‑5 계약으로 사실·사건·할일·결정·앵커를 일관 관리하고, SSV를 통해 의미 그래프를 클릭-오픈으로 연결.
- 운영: 체크포인트·관측(OTel)·평가를 통해 반복 가능하고 되짚을 수 있는 실행 기록.

## 현재 상태
- 문서·규칙: `.rules` v2.10, `AGENTS.md`(한국어 기본, DRY‑RUN/PLAN→PATCH→PROVE), SSOT 문서 일람 정비.
- UI 코드: `ui/dev_a1_vite`에 레이아웃(A1Grid), 타임라인/스레드/작성기/툴스/인디케이터 구성요소 다수 존재. 모놀리식 페이지는 4200+라인 규모.
- 태스크/도구: VS Code tasks로 dev/test/lint/py-test + context 스냅샷/정리 루틴 구비.
- 가드레일 상태: `guard:ui` 정적 검사 통과(PASS) — composer-actions 마킹 보정 후 경고 제거.

## 해야 할 일(Backlog)
- A&A 프로토콜로 파일별 책임·관계 주석화(최소: index.html, A1Grid.jsx, ChatTimeline.jsx, Composer.jsx, ThreadList.jsx).
- CKPT API 연동 태스크를 통해 주요 결정/게이트 통과 시 증거 기록.
- 스냅샷 루틴 정착: 라운드 시작/종료 latest, 마일스톤 both.
- docs/** 주요 항목 초록화(요약 카드) 후 링크 교차 검증.

## UI 현대화(A1 → dev_a1_vite) 마이그레이션 계획
1) 레이아웃 토대: `#a1-wrap` Grid → `A1Grid.jsx`로 명시, rows: `auto minmax(0,1fr) auto`, 높이 계산식 반영.
2) 스크롤러 2개 규칙: `#gg-threads` ↔ `#chat-msgs`만 overflow:auto 유지 확인(정적/런타임 가드).
3) 타임라인: 모놀리식의 메시지 렌더링 → `MessagesView.jsx`/`Message.jsx`로 이관, 키/가상화 고려.
4) 작성기: 단축키/버튼(데이터 속성 `[data-gg="composer-actions"]`) 유지하며 `Composer.jsx`로 역할 분리.
5) 스레드: `ThreadList.jsx`로 추출, 선택/읽지않음/고정 상태 관리 `chatStore.ts` 연동.
6) 툴스/인디케이터: `ToolsPanel/ToolsManager` 및 `BottomDock/Cue`로 모듈화.
7) 상태/증거: `state/*`와 `evidence/threadContext.ts` 정리, 보내기 파이프라인(`sendPipeline.ts`) 통합.
8) 수용 기준: ST‑1206 정적 스캐너 패스, 개발자 도구에서 overflow:auto 2곳만 검출, 콘솔 경고 0, 키 UX 시나리오 패스.

### 모놀리식 → 컴포넌트 매핑표(초안)
- Header/Toolbar → `components/chat/TopToolbar.jsx`
- 좌측 스레드 리스트 → `components/chat/ThreadList.jsx` + `components/layout/LeftThreadsPane.jsx`
- 중앙 타임라인 영역 → `components/chat/ChatTimeline.jsx` + `components/chat/messages/*`
- 메시지 단위 렌더 → `components/chat/messages/Message.jsx`
- 작성기(입력/버튼) → `components/chat/Composer.jsx` + composer 하위 버튼들
- 상태 저장소 → `state/chatStore.ts` / `state/dbStore.ts`
- 전송 파이프라인 → `features/chat/sendPipeline.ts`
- 인디케이터/바텀 큐 → `components/indicators/BottomDock.jsx`, `BottomCue.jsx`
- 툴스 패널 → `components/tools/ToolsPanel.jsx`, `ToolsManager.jsx`

### 스타일/레이아웃 불변식(a1.css 요약)
- 래퍼: `#a1-wrap { display:grid; grid-template-rows: auto minmax(0,1fr) auto; height: calc(100dvh - var(--gg-strip-h)); }`
- 스크롤러: `#gg-threads`, `#chat-msgs`만 `overflow:auto` 허용(그 외는 기본 visible)
- 너비: `--gg-chat-width`를 타임라인과 composer가 공유(중앙 정렬·일관 폭)
- 패딩: `--gg-right-pad`를 drawer 상태에 따라 `A1Grid`가 동기화하여 중앙 정렬 유지

### LibreChat 적용 포인트(요약)
- 메시지 뷰: `MessagesView.tsx`의 렌더·가상화 패턴 → `messages/*`에 반영
- 스크롤 UX: `useMessageScrolling` 유사 전략 → `useAutoStick` 보강 및 Jump 버튼 조건
- 상태: 전역 store 결합(`client/src/store/*`) 구조에서 A1 `chatStore.ts` 인터페이스 정제
- 라우팅: `ChatRoute.tsx`의 화면 구성 패턴을 `MainModeRouter.jsx`와 `CenterStage.jsx` 정합 검토

## 리스크와 수용 기준
- 리스크: 모놀리식에서 스타일·스크립트 참조 누락, 상태 경합, 성능(스크롤/가상화) 이슈.
- 대응: 컴포넌트별 스냅샷/테스트, 단계별 Gate 통과 시 CKPT 기록, 런타임 `assertUIPitstop`.
- 수용 기준: `.rules` ST‑1206 MUST/MUST‑NOT 전부 충족, 회귀 시나리오(회상/보내기/리커버리) 통과.

### ST‑1206 수용 기준 체크리스트(상세)
- Global 숨김(Simple): `html, body { overflow: hidden }` 확인.
- 두 개의 스크롤러만: `#gg-threads`, `#chat-msgs`만 `overflow:auto` 허용.
- 래퍼 그리드: `#a1-wrap { display: grid; grid-template-rows: auto minmax(0,1fr) auto; height: calc(100dvh - var(--gg-strip-h)); }`.
- 너비 공유: `--gg-chat-width`를 `#chat-msgs`와 composer가 공유.
- 입력 영역: Simple 모드에서 입력/버튼이 별도 스크롤러를 만들지 않음(overflow:visible/hide 강제).
- DOM 안정성: `#a1-wrap` self-closing 금지, id/구조 유지.
- 동적 센서(assertUIPitstop): 런타임에서
  - 스크롤러 화이트리스트 위배 없음 → OK
  - `#a1-wrap`이 grid → OK
  - `#chat-msgs`가 세로 스크롤 소유(overflowY:auto) → OK
- 정적 스캐너: `npm run guard:ui` 통과.

검증 방법
- 정적: VS Code Task `guard:ui` 또는 `npm run guard:ui`
  - 경로: `scripts/check_ui_guardrails.cjs:3`
- 런타임: `ui/overlays/test_guardrails.js:15` (개발 모드에서 실행 시 콘솔 로그로 결과 확인)
- 코드 기준점: `ui/dev_a1_vite/src/components/layout/A1Grid.jsx:1`, `ui/dev_a1_vite/src/components/chat/ChatTimeline.jsx:1`

### 운영 체크리스트(작업 라운드)
- Latest 스냅샷: `context:snapshot:latest` (라운드 시작/종료)
- 아카이브: `context:snapshot:archive` (마일스톤/리부트 직전)
- 가드레일: `guard:ui` (경고 0 유지), 필요 시 런타임 센서 확인
- 체크포인트: 의사결정/게이트 통과 시 CKPT API append

## 다음 단계
- SSOT·보고서·UI 파일 추가 요약을 reading_log.md에 지속 축적.
- 모놀리식 → 컴포넌트 매핑표 작성 및 검증.
- 1차 마이그레이션 PR 초안(diff, Dry‑Run) 작성 후 승인 요청.
