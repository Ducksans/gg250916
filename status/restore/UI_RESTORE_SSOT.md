# UI 복원 작업 — SSOT (Single Source of Truth)

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

## 1) 현황(Status) — 2025-09-08T00:xxZ (KST: 오전 09:xx)

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
- 기존 “Command Center” 급 화면(Agent/Planner/Insights/Executor) 재현은 아직 골격 작업 대기
- FastAPI /api/chat 라우트 생성 및 Dev UI 호출부 전환(테스트 중)

---

## 2) 증거(Evidence)

아래 경로는 실제 리포 내 파일/구성 변경을 뒷받침합니다(최소 1개 이상 증거 규칙).

- Dev UI (A1, Vite 5173)
  - ui/dev_a1_vite/index.html
  - ui/dev_a1_vite/vite.config.ts
  - ui/dev_a1_vite/src/main.jsx
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
- 상태 체크포인트(런 기록)
  - status/checkpoints/CKPT_72H_RUN.jsonl (FE Recovery 항목 포함)

---

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
- A1 채팅 API: FastAPI 기본(/api/chat, /api/chat/stream), Bridge는 선택(/bridge/api/chat)
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

완료[✓] / 진행[→] / 대기[□]

- [✓] Dev UI 5173 부팅(base=/ui-dev/)
- [✓] Redirect loop 제거(devBaseRewrite 제거, base만 사용)
- [✓] Bridge 프록시 rewrite(/bridge → /) 적용
- [✓] 소스맵 복원 스크립트 추가 및 실행(원본 일부 복원)
- [→] 복원 컴포넌트(A1 Threads/Composer/Sentinel/Layout/Viewport) dev_a1_vite로 이식
- [→] 상단 상태바에 “스냅샷 열기(3037)”/Base 변경 추가
- [✓] FastAPI /api/chat 라우터 추가 및 __init__ 등록
- [✓] Dev UI 호출부 /bridge/api/chat → /api/chat 전환
- [→] A1 채팅 API 연결(실제 전송/응답)
- [□] 스트리밍(/api/chat/stream) 수신 적용(옵션)
- [□] 화면 골격 복원(Agent/Planner/Insights/Executor)
- [□] ST‑1206 경고 0(두 스크롤러/rows/컴포저 마크)
- [□] Dev/Console warning 0, 모바일 가시성 Pass
- [□] 스크린샷/Evidence 저장 + Checkpoint 업데이트

---

## 6) 리스크/메모

- 과거 소스의 상당 부분이 dist만 남아있어 1:1 완벽 복원은 소스맵 포함 여부에 좌우됨
- 소스맵에 포함되지 않은 부분은 스냅샷/스크린샷 기반 재구현 필요
- 리다이렉트/캐시/IPv6/프록시 등 로컬 환경 영향 가능 → 문서화/자동화로 완화
- 기능 화면은 우선 골격/더미 데이터로 “보여지는 것”부터 확보 후 API 바인딩

---

## 7) 다음 단계(Next Steps)

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
- 도구 실행(fs.read): curl -s -X POST http://127.0.0.1:8000/api/tools/invoke -H "Content-Type: application/json" -d '{"tool":"fs.read","args":{"path":"gumgang_meeting/README.md"}}' | jq .
- 툴콜 대화(OpenAI): curl -s -X POST http://127.0.0.1:8000/api/chat/toolcall -H "Content-Type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"오늘 날짜와 시간(now)을 알려줘"}]}' | jq .

체크리스트(추가)
- [→] MCP‑Lite 서버 툴 정의/실행 라우트 배포(/api/tools/*)
- [→] /api/chat/toolcall(OpenAI function calling) 1~3 스텝 툴 루프 동작
- [□] UI Tools Manager(툴 목록/활성화, Agent에 연결)
- [□] 타임라인 툴 호출/결과 로그 표시(chatStore.mcp.invocations 연동)
- [□] 안전 경로 가드(화이트리스트·크기 제한) 문서화 및 테스트
- [□] Anthropic tool_use 연동(차기)

보안/가드레일
- fs.read는 gumgang_meeting/** 하위만 허용, 민감/대용량 디렉토리 deny, 파일 크기 상한 적용
- web.search는 외부 API 불가 시 검색 URL 폴백(오류 노이즈 최소화)
- 툴 결과는 JSON으로 캡슐화하여 모델에 전달(프롬프트 주입 최소화)

Git 운영(자산 보호)
- 모든 변경은 Git으로 추적(단일 사용자 환경 기준)
  - 브랜치: feature/mcp-lite, feature/agents, feature/prompts 등
  - 커밋: 의미있는 최소 단위(“feat(mcp): add /api/tools/invoke” 등)
  - 증거 링크를 커밋 메시지 또는 PR 본문에 포함(.rules “Turn & Evidence” 준수)
- 권장 워크플로우
  - pull → 작업 → 테스트 → 커밋 → push → 태그/체크포인트(status/checkpoints/CKPT_72H_RUN.jsonl) 갱신