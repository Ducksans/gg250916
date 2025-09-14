# UI 복원 작업 — SSOT (Single Source of Truth)

[Status Patch — 2025-09-08]
- Anthropic(Claude) 일반 대화: FastAPI /api/chat 경로 정상 동작(스펙 준수: content blocks, 첫 user, system 생략).
- Anthropic tool_use: Dev UI(코드 리뷰어/Claude 선택 + Tool Mode ON)에서 400/미사용 지속 → 일시 PASS(추후 디버깅).
- OpenAI 경로: /api/chat, /api/chat/stream, /api/chat/toolcall 정상. Tools(now/fs.read/web.search) 사용은 OpenAI 우선.
- 운영 가이드(임시): “툴이 필요한 작업은 GPT, 코드 리뷰/리팩터링은 Claude(툴 없이)”로 분리 운용.
- 다음 단계(권장): Provider-aware Tool Mode
  - Claude 에이전트 선택 시 Tool Mode 토글 비활성 또는 경고 배지(“툴은 GPT 에이전트에서 사용 권장”) 노출
  - GPT 에이전트 선택 시 Tool Mode ON 허용(현행 유지)
- 증거(Evidence)
  - 백엔드: gumgang_0_5/backend/app/api/routes/chat_gateway.py — Anthropic plain 포맷 수정(anthropic-beta 제거, system 생략, content blocks)
  - Dev UI: ui/dev_a1_vite/src/main.jsx — Tool Mode/Tools 패널 동작(수동 도구 호출 및 로그)
  - 런북: README.md — Tool-call(OpenAI/Anthropic) 안내 및 테스트 명령

본 문서는 “금강 UI(브릿지 3037 + Dev 5173)” 복원 프로젝트의 단일 진실 공급원(SSOT)입니다.  
스레드가 리부트되어도 이 문서만 보면 같은 속도로 복구를 이어갈 수 있도록 설계합니다.

- Owner: Gumgang UI Restore
- Scope: A1 중심의 Dev UI(5173) 복구 → 기존 Command Center 수준까지 단계적 확장
- Current Dev URL: http://localhost:5173/ui-dev/
- Bridge URL: http://localhost:3037/ui/
- Backend (FastAPI): http://127.0.0.1:8000/api/health

---

## 0) 목적(Goals)

- Vite 기반 Dev UI(포트 5173)를 재가동하고, 기존 “Command Center” 수준의 화면/기능으로 단계적 복원
- 브릿지(3037)와 백엔드(8000)와의 통신을 안정화하고, ST‑1206 UI Guardrails(두 스크롤러, grid rows 등) 준수
- sourcemap을 활용한 원본 소스 복원 + 스냅샷(정적) 기반 모듈화로, 빠르게 “보이는” 것부터 되살림

성공 기준(AC):
- Dev UI(5173)에서 A1 채팅/스레드/컴포저/우측 패널(섹션) 및 상단 상태바가 정상 동작
- 브릿지/백엔드 헬스·파일 열기/저장·API 호출 성공
- 주요 화면(Agent, Planner, Insights, Executor) 최소 골격 + 더미/실데이터 번갈아 확인(점진적 실제 데이터 연결)
- ST‑1206 검증 통과(두 스크롤러 외 추가 스크롤 금지, #a1-wrap grid rows = auto minmax(0,1fr) auto)

---

## 1) 현황(Status) — 2025-09-11T현재

- FastAPI 게이트웨이 안정화: /api/chat(단건/스트림), /api/tools/*, /api/chat/toolcall(OpenAI) OK.
- Anthropic(Claude) 경로: curl 기준 plain OK, Dev UI 일부 조합에서 400 지속(임시 PASS).
- Dev UI(A1 Vite):
  - Panels(우측 드로어) 도입 — Planner/Insights/Executor/Agents/Prompts/Files/Bookmarks 스켈레톤 탭 추가.
  - 중앙(타임라인/컴포저) “가시영역 기준” 정중앙 정렬 — 드로어 너비 관측 → #chat-msgs padding-right 반영(--gg-right-pad).
  - 컴포저 높이 관측 훅(useComposerSpace) 도입 — --gg-composer-h를 발행하여 #chat-msgs/#gg-threads 바닥 여유 자동 확보.
  - 타임라인 자동 바닥 고정(useAutoStick) + “현재로 이동” 미니 버튼(근접 임계값 32px)
  - 메시지 스타일을 버블→블록으로 전환(첫 줄 굵고 크게, 행간 여유). 역할 라벨은 ‘덕산(you)’/‘금강(assistant)’로 표기, 아이콘 배치.
  - 좌/우 가장자리 토글(EdgeToggles) 추가 — 좌측(Threads), 우측(Panels) 경계에 ‘‹/›’ 아이콘만 표시(오토 페이드/호버 강조/단축키 Alt+[ / Alt+]).
  - 좌측 Threads: 전체 높이 사용(grid-row:2/-1) + 무한 스크롤(IntersectionObserver) + 하단 겹침 방지(z-index/stripe 보정)
  - 좌측 Threads 폭 슬림(clamp 220px–280px) 및 전체 높이 사용(grid-row: 2/-1), 무한 스크롤(IntersectionObserver) 적용.
  - Provider‑aware Tool Mode — Claude/Gemini 선택 시 Tool Mode 자동 무력화 + 경고 배지.
  - Tools 수동 실행 → “Insert Last Tool Result”로 입력창에 삽입 가능.
  - 우측/좌측 토글과 무관하게 “가시영역 기준 중앙선” 유지(—gg-right-pad 관측·반영).
- 리팩터링(1파일 1기능) 진행:
  - 분리 완료: components/CommandCenterDrawer.jsx, components/chat/ThreadList.jsx
  - 추가 분리: components/chat/ChatTimeline.jsx → messages/MessagesView.jsx, messages/Message.jsx로 세분화
  - 레이아웃 분해(최신): A1Grid/CenterStage/LeftThreadsPane 도입, main.jsx는 부팅 전용(≤50줄)
  - 추가 분리: components/chat/Composer.jsx → composer/SendButton.jsx, composer/InsertLastToolResultButton.jsx
  - 추가 분리: components/chat/TopToolbar.jsx → agent/AgentSelector.jsx 추출
  - Tools 컨테이너 신설: components/tools/ToolsManager.jsx (정의/선택/파라미터/실행 상태 소유, ToolsPanel은 표시 전용)
  - 스타일 분리: src/styles/a1.css (레이아웃/토큰은 한곳에서 관리)
  - 사이드/센터 대비 강화: 좌/우 패널 배경 통일(--gg-side-bg), 중앙 작업영역 가독성 강화, 스크롤바 톤다운
- ST‑1206 가드레일 유지: #a1 내부 스크롤러 2개(#gg-threads, #chat-msgs), #a1-wrap grid rows=auto minmax(0,1fr) auto

- Dev UI(5173) 부팅 OK (base: `/ui-dev/`)
  - 상단 상태바: Backend OK, Bridge OK
  - A1 기본 레이아웃: Threads/Timeline/Composer 표시, 우측 패널 토글
- Redirect Loop 제거(5173)
  - dev_a1_vite: base를 `/ui-dev/`로 고정하고, devBaseRewrite 제거
- Bridge 프록시 404 해결
  - `/bridge/api/*` → 3037 `/api/*`로 rewrite 적용
- 소스 복원 진행
  - dist 소스맵에서 `main.tsx`, `RightDrawer.tsx` 등 복원
  - 백업(dist) 소스맵에서 `Threads.tsx`, `Composer.tsx`, `Sentinel.ts`, `Layout.tsx`, `Viewport.ts` 등 추가 복원
- 기존 "Command Center" 급 화면(Agent/Planner/Insights/Executor) 재현은 아직 골격 작업 대기
- FastAPI /api/chat 라우트 생성 및 Dev UI 호출부 전환(테스트 중)
- **[2025-09-11 완료] UI 5대 문제 해결:**
  - ✓ 타임라인 횡 스크롤바 제거: `#gg-threads`, `#chat-msgs`에 `overflow-x: hidden` 적용
  - ✓ 스레드 영속성 개선: localStorage 자동 저장/복원 메커니즘 구현
  - ✓ Import 제한 해결: 20개 → 500개로 확장, 배치 처리 및 진행 표시 추가
  - ✓ 스레드 컨텍스트 전달: AI 호출 시 현재 스레드 메시지 히스토리 자동 포함
  - ✓ Export 기능 추가: 현재 스레드들을 JSON 파일로 내보내기 가능
  - □ URL 라우팅: React Router 도입 필요 (향후 작업)

---

## 2) 증거(Evidence)

- 백엔드
  - gumgang_0_5/backend/app/api/routes/chat_gateway.py — Anthropic plain 포맷 수정(블록 배열/첫 user/system 생략, plain 경로에서 beta 헤더 제거), OpenAI/Anthropic 라우팅
- 프론트엔드
  - ui/dev_a1_vite/src/main.jsx — 상단/좌측/타임라인/컴포저 조립, Panels 버튼, Provider‑aware Tool Mode
  - ui/dev_a1_vite/src/components/CommandCenterDrawer.jsx — 우측 드로어(스켈레톤 + 각 탭 1건 실데이터 샘플 연결)
  - ui/dev_a1_vite/src/components/chat/ThreadList.jsx — 좌측 스레드 목록 컴포넌트
  - ui/dev_a1_vite/src/components/chat/ChatTimeline.jsx — 타임라인 컨테이너(#chat-msgs 유지, auto-stick 및 점프 버튼 연계)
  - ui/dev_a1_vite/src/components/chat/messages/MessagesView.jsx — 메시지 리스트
  - ui/dev_a1_vite/src/components/chat/messages/Message.jsx — 메시지 단일 렌더(툴 메타 표시)
  - ui/dev_a1_vite/src/components/chat/Composer.jsx — 입력/키보드/버튼 래핑
  - ui/dev_a1_vite/src/components/chat/composer/SendButton.jsx — 전송 버튼
  - ui/dev_a1_vite/src/components/chat/composer/InsertLastToolResultButton.jsx — 마지막 툴 결과 삽입 버튼
  - ui/dev_a1_vite/src/components/chat/TopToolbar.jsx — 상단 스트립
  - ui/dev_a1_vite/src/components/chat/agent/AgentSelector.jsx — 에이전트 선택 드롭다운
  - ui/dev_a1_vite/src/components/tools/ToolsPanel.jsx — 도구 패널(표시 전용)
  - ui/dev_a1_vite/src/components/tools/ToolsManager.jsx — 도구 정의/선택/파라미터/실행 관리 컨테이너
  - ui/dev_a1_vite/src/hooks/useHealth.js — 헬스 핑 훅
  - ui/dev_a1_vite/src/hooks/useGuardrails.js — ST‑1206 런타임 점검 훅
  - ui/dev_a1_vite/src/hooks/usePrefs.js — 로컬스토리지 기반 UI 설정 훅
  - ui/dev_a1_vite/src/styles/a1.css — 메인 레이아웃/토큰 스타일
  - ui/dev_a1_vite/src/hooks/useAutoStick.js — 타임라인 자동 바닥 고정 훅(임계 32px, 점프 버튼 연계)
  - ui/dev_a1_vite/src/state/chatStore.ts — Claude 모델 latest로 정정 + 마이그레이션
- 문서
  - README.md — 운영 가이드 및 UI 상태 업데이트(2025‑09‑08)

아래 경로는 실제 리포 내 파일/구성 변경을 뒷받침합니다(최소 1개 이상 증거 규칙).

- Dev UI (A1, Vite 5173)
  - ui/dev_a1_vite/index.html
  - ui/dev_a1_vite/vite.config.ts (별칭 @ 안정화: 파일 URL → 파일경로 변환 적용)
  - ui/dev_a1_vite/src/main.jsx
  - ui/dev_a1_vite/src/styles/a1.css
  - ui/dev_a1_vite/src/hooks/{useHealth.js,useGuardrails.js,usePrefs.js}
  - ui/dev_a1_vite/src/components/** (위 나열)
- 브릿지/스냅샷/헬스
  - bridge/server.js
  - ui/snapshots/unified_A1-A4_v0/index.html
- 소스맵 복원/도구
  - scripts/recover_sourcemap.mjs
  - ui/lc_app/dist/index.html
  - ui/lc_app_recovered/src/main.tsx
  - ui/lc_app._backup_20250829_165058/dist/index.html
  - ui/lc_app_recovered_backup/src/{a1/Threads.tsx,a1/Composer.tsx,a1/Sentinel.ts,a1/Layout.tsx,a1/Viewport.ts,main.tsx}
- ST‑1206 Guardrails
  - .rules
  - rules/ai/ST-1206.ui.rules.md
- FastAPI /api/chat 전환
  - gumgang_0_5/backend/app/api/routes/chat_gateway.py
  - gumgang_0_5/backend/app/api/__init__.py
  - ui/dev_a1_vite/src/main.jsx
  - .rules
- Dev UI(스트리밍·토글·스레드 UX·툴 모드/툴 매니저)
  - gumgang_0_5/backend/app/api/routes/chat_gateway.py (MCP‑Lite: tools/definitions, tools/invoke, chat/toolcall)
  - ui/dev_a1_vite/src/main.jsx (Tool Mode 토글, Tools 패널, /api/chat/toolcall 경로 연동)
- 상태 체크포인트(런 기록)
  - status/checkpoints/CKPT_72H_RUN.jsonl (FE Recovery 항목 포함)

---

- 추가 Evidence:
  - ui/dev_a1_vite/src/components/panels/Cards.jsx — Panels 카드 컴포넌트(Planner/Insights/Executor)
  - ui/dev_a1_vite/src/components/EdgeToggles.jsx — 좌/우 경계 토글(‹/›), 오토 페이드/단축키/터치 더블탭
  - ui/dev_a1_vite/src/hooks/useComposerSpace.js — 컴포저 높이 관측 → --gg-composer-h 발행
  - ui/dev_a1_vite/src/components/MainModeRouter.jsx — 중앙 라우팅(Placeholder)/비‑채팅 모드 풀‑폭
  - ui/dev_a1_vite/src/components/chat/messages/{Message.jsx,MessagesView.jsx} — 블록 스타일 메시지·아이콘·‘덕산/금강’ 라벨
  - ui/dev_a1_vite/src/components/chat/ThreadList.jsx — 무한 스크롤(IntersectionObserver), 액션 아이콘 축소(✎/🗑)
  - ui/dev_a1_vite/src/styles/a1.css — 좌측 폭 슬림(clamp), 컴포저/타임라인 배경 통일, 바닥 여유(padding-bottom: var(--gg-composer-h)), 중앙 정렬 보조
  - ui/dev_a1_vite/src/main.jsx — 드로어 폭 관측 → --gg-right-pad 반영, EdgeToggles/Center 패딩 연결
  - ui/dev_a1_vite/src/components/chat/messages/Message.jsx — 메시지 Hover 액션(복사/삭제/핀/재실행)
  - ui/dev_a1_vite/src/components/chat/messages/MessagesView.jsx — Hover 액션 핸들러 전달
  - ui/dev_a1_vite/src/components/chat/ChatTimeline.jsx — Hover 액션 처리(copy/delete/pin/rerun)
  - ui/dev_a1_vite/src/styles/a1.css — pinned/hover action 보조 스타일
## 3) 시스템 포트/런 북(Runbook)

- Backend: 8000 (Uvicorn/FastAPI)
- Bridge: 3037 (Node)
- Dev UI: 5173 (Vite, base=/ui-dev/)
- Next.js App(별도): 3000 (gumgang_0_5/gumgang-v2)

자주 쓰는 커맨드(참고)
- Dev UI(A1 / 5173)
  - cd ui/dev_a1_vite && npm install && npm run dev
  - 접속: http://localhost:5173/ui-dev/
- Bridge(3037)
  - node bridge/server.js
  - 헬스: curl -s http://127.0.0.1:3037/api/health
- Backend(8000)
  - uvicorn app.api:app --reload --host 127.0.0.1 --port 8000
  - 헬스: curl -s http://127.0.0.1:8000/api/health
  - 채팅: curl -s -X POST http://127.0.0.1:8000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"ping"}]}'
  - MCP‑Lite 도구 정의: curl -s http://127.0.0.1:8000/api/tools/definitions | jq .
  - MCP‑Lite 도구 실행(now): curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"now","args":{}}' | jq .
  - MCP‑Lite 도구 실행(fs.read): 
    - curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"README.md"}}' | jq .
    - curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"status/restore/UI_RESTORE_SSOT.md"}}' | jq .
  - Tool‑call(OpenAI): curl -s -X POST http://127.0.0.1:8000/api/chat/toolcall -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"오늘 날짜와 시간(now)을 알려줘"}]}' | jq .

주의
- Dev UI는 base를 `/ui-dev/`로 사용하므로 루트(/)가 아닌 /ui-dev/로 접속
- 브라우저 캐시/쿠키로 인한 리다이렉트 루프 발생 시 시크릿 창 또는 사이트 데이터 삭제

---

## 4) 작업 분류(Tracks)

A) A1 Dev 강화
- Threads/Timeline/Composer 상호작용 강화(엔터/단축키/스크롤 센티넬)
- Right Drawer 섹션(Agent/Prompts/Files/Bookmarks 등) UI 생성
- 상단 상태바에 “스냅샷 열기(3037)” / Base 변경 / Reload / Ping

B) API/브릿지 연동
- 헬스 OK 유지: /api/health(8000), /bridge/api/health(3037)
- 파일 열기/저장: /bridge/api/open, /bridge/api/save, /bridge/api/fs/*
- A1 채팅 API: FastAPI 기본(/api/chat, /api/chat/stream, /api/chat/toolcall), Bridge는 선택(/bridge/api/chat)
  - 키: OPENAI_API_KEY / ANTHROPIC_API_KEY(or ANTHROPIC_KEY) / GEMINI_API_KEY (.env)
  - 타임아웃/예외 처리/로깅 점검

C) 기능 화면 복원(골격 → 데이터)
- Agent: 검색/카드/테스트 버튼
- Planner(포털): 테이블/필터/액션
- Insights: KPI 카드/표
- Executor: 작업 리스트/상태/진행률/액션

D) Guardrails/품질
- ST‑1206 센서 경고 제거(두 스크롤러 외 금지, grid rows 정합, composer [data-gg="composer-actions"])
- 콘솔 경고 0, 모바일 키보드/회전 시 컴포저 가시 유지

---

## 5) 체크리스트(Checklist)

완료[✓] / 진행[→] / 보류[□]

- [✓] FastAPI /api/chat 게이트웨이(단건/스트림) 정상
- [✓] /api/tools/definitions, /api/tools/invoke 정상
- [✓] /api/chat/toolcall(OpenAI) 정상
- [✓] Panels(우측 드로어) 스켈레톤 탭 추가
- [✓] Provider‑aware Tool Mode 적용(Claude/Gemini에서 무력화+배지)
- [✓] Tools 수동 실행 → 입력창 삽입 버튼
- [✓] ThreadList 컴포넌트 분리 및 중복 렌더 제거
- [✓] ChatTimeline/Composer/TopToolbar/ToolsPanel 분리
- [✓] Planner/Insights/Executor 스켈레톤 고도화(표/카드/진행률)
- [✓] 스레드 키보드 네비게이션(↑/↓/Enter/F2/Delete) 완성
- [✓] 메시지 Hover 액션(복사/삭제/핀/재실행)
- [□] Anthropic UI 400 재현/원인 정리 및 옵션화(beta 헤더 스위치)
- [✓] 타임라인 횡 스크롤바 문제 해결 (2025-09-11)
- [✓] 스레드 영속성 문제 해결 (2025-09-11)
- [✓] Import 제한 문제 해결 (2025-09-11)
- [✓] 스레드 컨텍스트 전달 문제 해결 (2025-09-11)

- [→] A&A 프로토콜 (분석 및 주석)
  - [✓] `index.html` (2025-09-11 00:41 KST)
  - [✓] `src/main.jsx` (2025-09-11 00:46 KST)
  - [✓] `src/components/A1Dev.jsx` (2025-09-11 01:04 KST)
  - [✓] `src/styles/a1.css` (2025-09-11 01:18 KST)
  - [✓] `src/components/CommandCenterDrawer.jsx` (2025-09-11 01:24 KST)
  - [✓] `src/components/EdgeToggles.jsx` (2025-09-11 01:27 (KST))
  - [✓] `src/components/MainModeRouter.jsx` (2025-09-11 01:29 KST)
  - [✓] `src/components/chat/ChatTimeline.jsx` (2025-09-11 01:33 KST)
  - [✓] `src/components/chat/Composer.jsx` (2025-09-11 01:37 KST)
  - [✓] `src/components/chat/ThreadList.jsx` (2025-09-11 01:40 KST)
  - [✓] `src/components/chat/TopToolbar.jsx` (2025-09-11 01:43 KST)
  - [✓] `src/components/chat/agent/AgentSelector.jsx` (2025-09-11 01:47 KST)
  - [✓] `src/components/chat/composer/InsertLastToolResultButton.jsx` (2025-09-11 01:53 KST)
  - [✓] `src/components/chat/composer/SendButton.jsx` (2025-09-11 01:56 KST)
  - [✓] `src/components/chat/messages/Message.jsx` (2025-09-11 02:00 KST)
  - [✓] `src/components/chat/messages/MessagesView.jsx` (2025-09-11 02:03 KST)
  - [✓] `src/components/common/ConfirmDialog.jsx` (2025-09-11 02:08 KST)
  - [✓] `src/components/indicators/BottomCue.jsx` (2025-09-11 02:13 KST)
  - [✓] `src/components/indicators/BottomDock.jsx` (2025-09-11 02:16 KST)
  - [✓] `src/components/layout/A1Grid.jsx` (2025-09-11 02:20 KST)
  - [✓] `src/components/layout/CenterStage.jsx` (2025-09-11 02:23 KST)
  - [✓] `src/components/layout/LeftThreadsPane.jsx` (2025-09-11 02:26 KST)
  - [✓] `src/components/panels/Cards.jsx` (2025-09-11 02:29 KST)
  - [✓] `src/components/tools/ToolsManager.jsx` (2025-09-11 02:33 KST)
  - [✓] `src/components/tools/ToolsPanel.jsx` (2025-09-11 02:36 KST)
  - [✓] `src/hooks/useAutoStick.js` (2025-09-11 02:40 KST)
  - [✓] `src/hooks/useComposerSpace.js` (2025-09-11 02:42 KST)
  - [✓] `src/hooks/useGuardrails.js` (2025-09-11 02:46 KST)
  - [✓] `src/hooks/useGuardrails.js` (2025-09-11 02:46 KST)
  - [✓] `src/hooks/usePrefs.js` (2025-09-11 02:54 KST)
  - [✓] `src/hooks/useSimpleMode.js` (2025-09-11 11:58 KST)
  - [✓] `src/state/chatStore.ts` (2025-09-11 12:03 KST)
  - [✓] `vite.config.ts` (2025-09-11 01:21 KST)

완료[✓] / 진행[→] / 대기[□]

- [✓] Dev UI 5173 부팅(base=/ui-dev/)
- [✓] Redirect loop 제거(devBaseRewrite 제거, base만 사용)
- [✓] Bridge 프록시 rewrite(/bridge → /) 적용
- [✓] 소스맵 복원 스크립트 추가 및 실행(원본 일부 복원)
- [→] 복원 컴포넌트(A1 Threads/Composer/Sentinel/Layout/Viewport) dev_a1_vite로 이식
- [✓] 상단 상태바에 “스냅샷 열기(3037)”/Base 변경 추가
- [✓] FastAPI /api/chat 라우터 추가 및 __init__ 등록
- [✓] Dev UI 호출부 /bridge/api/chat → /api/chat 전환
- [✓] A1 채팅 API 연결(실제 전송/응답)
- [□] 스트리밍(/api/chat/stream) 수신 적용(옵션)
- [□] 화면 골격 복원(Agent/Planner/Insights/Executor)
- [→] ST‑1206 경고 0(두 스크롤러/rows/컴포저 마크)
- [→] Dev/Console warning 0, 모바일 가시성 Pass
- [→] 스크린샷/Evidence 저장 + Checkpoint 업데이트
  - [✓] 중앙 정렬 보정(--gg-right-pad) 적용 및 확인
  - [✓] 컴포저 높이 관측(--gg-composer-h) 적용 및 확인
  - [✓] 좌/우 경계 토글(‹/›) 적용 및 단축키 동작 확인
  - [✓] 좌측 Threads 무한 스크롤 및 전체 높이 사용 확인
  - [✓] 메시지 블록 스타일/아이콘/‘덕산·금강’ 라벨 확인
  - [✓] 타임라인 자동 바닥 고정(useAutoStick) + “현재로 이동” 미니 버튼(임계 32px) 1차 적용(PARTIAL PASS: 스트리밍·전송 직후 동작 확인, 모바일/드로어변화 추가 튜닝 예정)

---

## 6) 리스크/메모

- 과거 소스의 상당 부분이 dist만 남아있어 1:1 완벽 복원은 소스맵 포함 여부에 좌우됨
- 소스맵에 포함되지 않은 부분은 스냅샷/스크린샷 기반 재구현 필요
- 리다이렉트/캐시/IPv6/프록시 등 로컬 환경 영향 가능 → 문서화/자동화로 완화
- 기능 화면은 우선 골격/더미 데이터로 “보여지는 것”부터 확보 후 API 바인딩

---

## 7) 다음 단계(Next Steps)
- ST‑UI‑REFLOW‑NEXT‑C3 실행 순서 (합의된 A~F + auto-stick 패치)
  A) 메시지 액션 도킹(우상단, 아이콘화 ⧉↻📌🗑, 반응형: Desktop=항상, Tablet=hover/focus, Mobile=케밥 메뉴)
     - 삭제는 경고 모달 후 실행
     - 현황: 1차 도킹/반응형 적용(PARTIAL). 빨간 영역 정밀 도킹(헤더 2열 정렬) 및 모바일 케밥 팝오버 전환 예정.
  B) 타임라인·컴포저 폭 동기화(공유 경계/노란선): 동일 패딩 수식(—gg-left-pad, —gg-right-pad)로 줄바꿈 경계 일치
  C) 중앙선(파란선) 기준 정렬 유지: 드로어 폭 관측 → —gg-right-pad 반영, 두 컨테이너 동일 수식 사용
  D) 컴포저 아이콘 내장(입력 내부 우측, 🧩/➤, 20px 아이콘·33px 히트영역, 툴팁/키보드 접근성)
  E) 삭제 경고 모달(ConfirmDialog) 도입 — role="dialog", ESC/외부클릭 닫기, 파괴적 버튼 강조
  F) 모바일 3점(케밥 ⋮) 메뉴: 복사→재실행→핀 고정→삭제 순서, 키보드/포커스 트랩
  G) Auto-stick to bottom(임계 32px) + “현재로 이동” 미니 버튼: 발화/스트림 시 바닥 고정, 스크롤 업 시 보류
     - 현황: PARTIAL PASS — 전송 직후/스트리밍 중 바닥 고정 및 미니 버튼 동작 확인. bottom sentinel을 chat-panel 내부로 이동, 마지막 메시지 하단 스페이서(10px) 추가. 모바일/드로어 변화·희귀 타이밍 이슈 추가 튜닝 예정.

1) 컴포넌트 분리 마무리
   - ChatTimeline.jsx, Composer.jsx, TopToolbar.jsx, ToolsPanel.jsx
2) 우측 패널 고도화
   - Planner: 테이블 컬럼/검색/정렬 스켈레톤 + status/ 내 JSON/CSV 1건 연결
   - Insights: KPI 카드 3~4개(더미→실데이터 1개), 테이블 1개
   - Executor: 작업 리스트(상태/진행률/ETA) 스켈레톤 + 더미 진행률 애니메이션
3) UX/품질
   - 스레드 키보드 네비게이션 완성, 드로어 상태/탭 localStorage 유지
   - 에이전트 모델 배지(현재 model 표기)
4) Anthropic(보류)
   - UI 400 재현 조건 수집, beta 헤더 .env 스위치로 옵션화, OpenAI 경로 우선 운용 지속

프리플라이트 — ST‑CHAT‑FASTAPI
- /api/chat 라우터 생성(app/api/routes/chat_gateway.py)
- __init__ 등록(app/api/__init__.py, app.include_router)
- 프론트엔드 호출부 /bridge/api/chat → /api/chat 전환(ui/dev_a1_vite/src/main.jsx)
- 통합 테스트(uvicorn + vite): 채팅 입력 → “…” → 실제 답변 치환
- 스트리밍 옵션: /api/chat/stream (SSE) 수신 테스트

1) A1 강화 (오늘)
   - 복원된 A1 컴포넌트(Threads/Composer/Sentinel/Layout/Viewport) dev_a1_vite에 이식
   - 우측 패널 섹션 골격 생성 + 상단 Toolbar에 “스냅샷 열기(3037)” 추가
   - ST‑1206 센서 경고 제거

2) 파일/브릿지 연동 (내일)
   - Files 섹션에 Bridge /api/fs/* 연결(목록/열기/저장)
   - “열기 → 에디터/뷰” 최소 흐름 구성

3) 기능 화면 골격 (차주 초)
   - Agent/Planner/Insights/Executor 기본 UI 뼈대
   - 이후 API 바인딩(검색/지표/작업흐름) 점진 연결

4) 품질/수습
   - Console/런타임 경고 0
   - 모바일 가시성(회전/키보드) 보장

5) Provider-aware Tool Mode（권장 다음 작업）
   - Claude 에이전트 선택 시 Tool Mode 토글 비활성 또는 경고 배지 노출(“툴은 GPT 에이전트에서 사용 권장”)
   - GPT 에이전트 선택 시 Tool Mode ON 허용(현행 유지)
   - Tools 패널 수동 실행 결과를 Claude 타임라인에 쉽게 전달할 수 있도록 “Copy to chat” 버튼 추가

---

## 8) 변경 이력(Changelog)

- 2025-09-08
  - Dev UI(5173) 복구, base=/ui-dev/
  - Redirect loop 제거(미들웨어 제거)
  - Bridge 프록시 rewrite 적용
  - sourcemap 복구 스크립트 추가 및 일부 소스 복구

---

## 9) 부록 — ST‑1206 핵심 수칙(요약)

- Simple 모드 전역 스크롤 숨김: `html, body { overflow: hidden }`
- #a1 내부 overflow:auto는 정확히 2개: `#gg-threads`, `#chat-msgs`
- `#a1-wrap`은 grid, rows=`auto minmax(0,1fr) auto`
- `#a1-wrap` 높이: `calc(100dvh - var(--gg-strip-h))`
- Composer actions: `[data-gg="composer-actions"]`, grid col 2 (row 3)
- Console/runtime warnings = 0

참조:
- .rules
- rules/ai/ST-1206.ui.rules.md

---

## 10) 운영 메모(누구나 실행 가능하도록)

- “접속 안됨/빈 화면/루프” 발생 시
  1) http://localhost:5173/ui-dev/ 로 접속 (루트를 쓰지 않음)
  2) 시크릿 창 또는 사이트 데이터 삭제 후 재시도
  3) 서버 포트 점검: `ss -ltnp | sed -n '/:5173\\|:3037\\|:8000/p'`
- “Bridge ERR(404)” 발생 시
  - dev_a1_vite/vite.config.ts 의 `/bridge` 프록시에 rewrite가 있는지 확인:
    - rewrite: (path) => path.replace(/^\\/bridge/, "")
- “두 스크롤러 초과/rows 오류” 경고 발생 시
  - A1 DOM에서 overflow:auto 추가 컨테이너 제거
  - #a1-wrap grid rows 재확인

---

본 문서는 UI 복원 작업의 SSOT입니다. 변경 시 “증거 경로”를 반드시 첨부하고, 완료된 항목은 체크리스트에 체크하며 다음 단계를 갱신하십시오.

---

## 11) MCP‑Lite — 계획(Plan) · 엔드포인트(Endpoints) · 증거(Evidence)

목표
- 모델이 대화 중 도구 호출 의도를 표현하면(함수 호출/툴 JSON) 서버가 안전하게 실행 → 결과를 컨텍스트에 반영 → 최종 응답 생성
- v0는 OpenAI function calling 우선, 기타 프로바이더는 폴백(차후 Anthropic tool_use 연계)

엔드포인트(백엔드 · FastAPI)
- GET /api/tools/definitions — 서버 기본 툴 정의 조회
- POST /api/tools/invoke — 단일 툴 실행 { tool, args } → { ok, data | error }
- POST /api/chat/toolcall — OpenAI tools 루프 기반의 툴 인식/호출/후속 응답

기본 툴(초기 세트)
- now: 현재 UTC ISO8601 반환
- fs.read: gumgang_meeting/** 내부의 소형 UTF‑8 텍스트 파일 읽기(deny: .git, node_modules, __pycache__, dist, build, 크기 제한)
- web.search: DuckDuckGo Instant Answer 기반 간단 검색(제약 시 검색 URL 폴백)

증거(Evidence)
- 게이트웨이(툴·툴콜 루프·라우트)
  - gumgang_meeting/gumgang_0_5/backend/app/api/routes/chat_gateway.py
    - /api/tools/definitions, /api/tools/invoke, /api/chat/toolcall 추가
- Dev UI(스트리밍·토글·스레드 UX)
  - gumgang_meeting/ui/dev_a1_vite/src/main.jsx
- 런/가드(핫리로드 제외·포트)
  - gumgang_meeting/scripts/dev_backend.sh

런북(확인용)
- 도구 정의: curl -s http://127.0.0.1:8000/api/tools/definitions | jq .
- 도구 실행(now): curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"now","args":{}}' | jq .
- 도구 실행(fs.read): curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"README.md"}}' | jq .
- 도구 실행(fs.read‑SSOT): curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"status/restore/UI_RESTORE_SSOT.md"}}' | jq .
- 툴콜 대화(OpenAI): curl -s -X POST http://127.0.0.1:8000/api/chat/toolcall -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"오늘 날짜와 시간(now)을 알려줘"}]}' | jq .

체크리스트(추가)
- [✓] MCP‑Lite 서버 툴 정의/실행 라우트 배포(/api/tools/*)
- [✓] /api/chat/toolcall(OpenAI function calling) 1~3 스텝 툴 루프 동작
- [→] UI Tools Manager(툴 목록/활성화, Agent에 연결) — 우측 Tools 패널 및 Tool Mode 토글 1차 적용
- [→] 타임라인 툴 호출/결과 로그 표시(chatStore.mcp.invocations 연동)
- [✓] 안전 경로 가드(루트 상대·정규화·민감 디렉토리 차단·64KB 제한) 문서화 및 테스트
- [✓] OpenAI 함수 이름 자동 안전화(fs.read→fs_read, web.search→web_search)
- [✓] Anthropic 일반 대화(plain) 경로 OK
- [□] Anthropic tool_use 연동(보류 — UI에서 400 관측; 계정/모델 권한 확인 후 재개)
- [→] Provider-aware Tool Mode: Claude 선택 시 Tool Mode 비활성/경고, GPT 선택 시 허용

보안/가드레일
- fs.read는 “프로젝트 루트 기준 상대 경로”만 허용(경로 정규화로 루트 밖 접근 차단), 민감/대용량 디렉토리(.git, node_modules, __pycache__, dist, build) deny, 파일 크기 상한(64KB) 적용
- web.search는 외부 API 불가 시 검색 URL 폴백(오류 노이즈 최소화)
- 툴 결과는 JSON으로 캡슐화하여 모델에 전달(프롬프트 주입 최소화)

Git 운영(자산 보호)
- 모든 변경은 Git으로 추적(단일 사용자 환경 기준)
  - 브랜치: feature/mcp-lite, feature/agents, feature/prompts 등
  - 커밋: 의미있는 최소 단위(“feat(mcp): add /api/tools/invoke” 등)
  - 증거 링크를 커밋 메시지 또는 PR 본문에 포함(.rules “Turn & Evidence” 준수)
- 권장 워크플로우
  - pull → 작업 → 테스트 → 커밋 → push → 태그/체크포인트(status/checkpoints/CKPT_72H_RUN.jsonl) 갱신

---

### 인계(Handover)
- 이번 스레드 성과
  - FastAPI 게이트웨이 /api/chat, /api/chat/stream, /api/chat/toolcall 구축·동작 확인
  - MCP‑Lite v0 배포: /api/tools/definitions, /api/tools/invoke, OpenAI tool‑call 루프(최대 3스텝)
  - fs.read 경로 가드 정석화(루트 상대·정규화·민감 디렉토리 차단·64KB 제한)
  - OpenAI 함수 이름 자동 안전화(fs.read→fs_read, web.search→web_search)
  - Dev UI: 스트리밍, 백엔드 토글(FastAPI/Bridge), New Thread, Tool Mode(ON/OFF), Tools 패널(툴 선택)
  - Panels(우측 드로어) 도입, Provider‑aware Tool Mode, Tools 수동 실행→입력창 삽입, 컴포넌트 분리(ThreadList/CommandCenterDrawer)
  - README 런북/테스트 업데이트(즉시 실행 가능한 curl 포함)
- 다음 단계(제안)
  1) UI Tools Manager 고도화: 우측 패널 고정, 툴별 파라미터 폼, 수동 호출/로그 뷰, 타임라인 연동
  2) Anthropic tool_use 연동(Claude 계열 도구 호출 루프)
  3) Agent Manager v1(agents.json 파일 기반 CRUD) + Prompt Library v0
  4) 워크플로우 에디터 초안(React Flow): Trigger → Tool → LLM → Transform → Output

트리거 문장
- ST‑UI‑REFLOW‑NEXT — “A1 Dev UI 컴포넌트 분리를 마무리하고(타임라인/컴포저/툴바/툴스 패널), Panels(Planner/Insights/Executor) 스켈레톤에 실제 데이터 1건씩 연결합니다. Claude 400은 임시 PASS로 유지하고 OpenAI 경로 우선 운용을 확정합니다.”