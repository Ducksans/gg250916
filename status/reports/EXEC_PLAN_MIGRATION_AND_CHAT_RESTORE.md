---
phase: present
---

# 실행 계획 보고서 — Dev UI 마이그레이션 및 채팅 로직 복원 (EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE)

- 문서 버전: v1.0
- 작성자: Gemini (금강 AI)
- 작성 시각: 2025-09-11T11:24Z (UTC) / 2025-09-11 20:24 (KST)
- 적용 범위: gumgang_meeting/**
- SSOT 참조:
  - 미래(로드맵): status/roadmap/BT11_to_BT21_Compass_ko.md
  - 현재(아키텍처): status/reports/forensic_report_v1.md
  - 과거(복구 계획): status/restore/UI_RESTORE_SSOT.md

---

## 0) 배경과 목적

- 현재 스냅샷 UI(http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html#a1)는 “사실/기억 기반 대화(증거 주입)”가 가능하나, 단일 거대 HTML 구조로 인해 유지보수/디버깅 비용이 큼.
- Dev UI(http://localhost:5173/ui-dev/)로 마이그레이션 중이며, 구성 요소(컴포넌트) 기반으로 분해하여 안정성과 변경 용이성을 확보하는 것이 목표.
- 본 문서는 “가장 먼저 채팅 로직 복원”을 달성하기 위한 전체 실행 계획과 우선 순위를 기록한다.

핵심 목표
- Dev UI에서 A1~A4 시절 “기억·증거·기록” 파이프라인을 재현한다.
- 스냅샷의 오케스트레이션(sendChat) 로직을 Dev UI의 상태/컴포넌트 구조에 맞게 이식한다.
- MCP-Lite(도구 호출)로 파일 시스템/웹 크롤링을 단계적으로 확장한다.
- Tauri 빌드 안정화, Monaco 에디터 활성화, “코딩 전용 에이전틱 AI” 환경으로 확장한다.

---

## 1) 실행 순서(제안 · 승인 대상)

사전 빠른 점검(0)
- Backend 8000, Bridge 3037 헬스 OK 확인.
- Dev UI base(/ui-dev/), 프록시(/api, /bridge) 동작 확인.

1. 스냅샷 채팅 응답 경로 재확인(즉시 가능)
- 경로: http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html#a1
- 목적: 현재 환경에서 정상적으로 “증거 블럭 + 응답” 흐름이 살아있는지 재확인.

2. “대화 스레드 복구” (가장 먼저 수행할 실제 구현)
- 소스: /home/duksan/바탕화면/gumgang_meeting/migrated_chat_store.json
- 목표: Dev UI(5173)의 스레드/메시지 구조(chatStore.ts)에 마이그레이션하여 좌측 Thread 리스트 및 타임라인에서 열람 가능.

3. “채팅 로직 복원” (Dev UI에 기억·증거·기록 파이프라인 이식)
- 파이프라인: Recall → Strict Gate → Reason → Record(+Checkpoints trigger)
- A1Dev.jsx의 `send` 경로와 `chatStore.ts`에 로직을 모듈화/주입.

4. 파일 컨트롤용 MCP 확장(Zed 유사)
- 도구: fs.list, fs.read(기존), fs.write, fs.move, fs.delete (프로젝트 경계/제외 패턴 준수)
- 프론트: ToolsManager/ToolsPanel에서 파라미터 입력 + 수동 실행/선택형 Tool Mode.

5. 웹 크롤링/스크래핑 MCP
- 1차: HTTP 기반 web.fetch(url), web.scrape(url, selector[, attr]) + 화이트리스트/사이즈 가드
- 2차(옵션): 헤드리스 렌더(web.render)로 확장(브릿지/별도 모듈 스폰).

6. 에이전트 설정 UI 활성화
- Agents 페이지(시스템 프롬프트/모델/툴셋 CoT 템플릿), 저장은 chatStore.ts upsertAgent 사용.

7. Tauri 빌드 안정화 → Monaco/Agentic Dev 환경
- 프리플라이트 → dev/build 스모크 → 에디터 탑재 → MCP와 왕복 편집/적용 흐름.

승인 시 오늘은 2→3 순서로 바로 진입(“스레드 복구” → “채팅 로직 복원”).

---

## 2) 즉시 작업 — 채팅 로직 복원(Dev UI)

대상
- 프런트:
  - ui/dev_a1_vite/src/components/A1Dev.jsx
  - ui/dev_a1_vite/src/state/chatStore.ts
  - ui/dev_a1_vite/src/components/chat/* (타임라인/컴포저/툴바 등)
- 백엔드(참조):
  - gumgang_0_5/backend/app/api/routes/chat_gateway.py (chat, chat/stream, tools/*)
  - app/api.py (threads/memory/checkpoints 계열이 있는 경우 연계)

복원 파이프라인(스냅샷 parity)
- Recall(회상):
  - GET /api/memory/search?q=...&k=5&need_fresh=1&self_rag=1
  - 상위 N건을 bullets와 refs로 가공하여 화면에 “증거 블럭(details)” 렌더
- Strict Gate(엄격 게이트):
  - 회상 결과가 0건일 때, 특정 조건에서는 LLM 호출 차단 또는 저신뢰 응답 모드로 degrade
  - “근거 부족 – 답변 보류” 메시지 패턴 유지 가능(정책 택1)
- Reason(추론):
  - POST /api/chat 또는 /api/chat/stream (SSE)로 응답 수신
  - Tool Mode ON일 때는 /api/chat/toolcall 사용(모델이 OpenAI 계열일 때만)
- Record(기록):
  - POST /api/threads/append, /api/memory/store 로 사용자/어시스턴트 턴 저장
  - 필요 조건 충족 시 /api/checkpoints/append(6필드)로 EOD 체크포인트 추가

UI/UX 요구사항(ST‑1206)
- 스크롤러는 정확히 2개: #gg-threads, #chat-msgs
- Grid 레이아웃/토큰: #a1-wrap rows=auto minmax(0,1fr) auto, --gg-strip-h/--gg-chat-width 공유
- Composer 액션 마크업: [data-gg="composer-actions"] 유지
- 모바일 회전/키보드 시에도 Composer 가시성 유지

수용 기준(AC)
- Dev UI에서 질문 전송 → (1) 증거 블럭 노출 → (2) 스트리밍/단일 응답 패치 → (3) 타임라인/메모/스레드 기록 생성
- Tool Mode: OpenAI 계열일 때만 /chat/toolcall 경로 사용, Claude/Gemini는 자동 OFF
- 콘솔 경고 0, ST‑1206 가드 통과(npm run guard:ui)

리스크/완화
- 증거/메모 API 불일치 → 스냅샷에서 사용한 필드명/계약 재확인 후 어댑터 계층으로 호환성 확보
- SSE 파서/버퍼링 → 기존 A1Dev.jsx 스트리밍 분기 활용
- 엄격 게이트 UX → “근거 부족” 정책 플래그로 온/오프 가능하게 설계

---

## 3) 스레드 복구 계획(우선 수행)

입력 파일
- /home/duksan/바탕화면/gumgang_meeting/migrated_chat_store.json

매핑 전략
- 기존 JSON의 threads/agents/messages 구조를 `chatStore.ts` 타입으로 매핑:
  - Agent: { id, name, model, systemPrompt, tools?, tags? }
  - Thread: { id, title, agentId, createdAt, updatedAt, messages[] }
  - Message: { id, role, content, ts, meta? }
- 누락 필드는 기본값/마이그레이션 규칙 적용(예: claude-3.5-sonnet → claude-3-5-sonnet-latest 정규화)

절차
- 임시 “Import Threads” 액션 추가(TopToolbar 또는 Tools 패널):
  - 클릭 → 서버 MCP(fs.read) 또는 브릿지(/bridge/api/fs/read)로 파일 읽기
  - JSON 파싱 → 유효성 검증 → chatStore.actions.* 로 주입 → localStorage 영속화
- AC:
  - 좌측 Threads에 복구된 항목이 나타나고, 타임라인에서 메시지 열람 가능.

주의
- 프로젝트 경계 원칙을 지키며, 외부 경로 접근 금지
- 덮어쓰기와 병합 전략을 구분(기본: 병합, 충돌 시 신규 스레드로 보존)

---

## 4) MCP 확장 — 파일 컨트롤(Zed 유사)

서버(도구)
- 추가 툴(안전 가드 포함):
  - fs.list(rootRelDir)
  - fs.read(path) [존재]
  - fs.write(path, content, { ensureDirs?, overwrite? })
  - fs.move(src, dst, { overwrite? })
  - fs.delete(path)
- 보안/정책:
  - 프로젝트 루트 밖 접근 금지
  - 제외 패턴: .git/**, node_modules/**, dist/**, build/**, __pycache__/** 등
  - 최대 파일 크기 제한(읽기/쓰기), 텍스트 전용 우선

프론트
- ToolsManager/ToolsPanel 파라미터 입력 UI 제공
- 실행 결과는 타임라인에 로그(도구 호출/결과)로 자동 기록

AC
- 파일 생성/수정/이동/삭제가 금지 디렉토리 바깥에서만 성공
- 실패 시 의미있는 에러 메시지 + 로그가 남는다

---

## 5) MCP 확장 — 웹 크롤링/스크래핑

1차(HTTP 기반, 안전)
- web.fetch(url): 화이트리스트/사이즈/컨텐츠타입 제한
- web.scrape(url, selector[, attr]): 간단 DOM 추출(서버측 파서 기반)
- 화이트리스트 도메인: 운영 문서/공식 레퍼런스 중심(팀 합의 후 확정)

2차(옵션, 헤드리스)
- web.render(url, wait, selector): 브라우저 렌더링 필요 페이지 대응(Puppeteer 캡슐화)
- 긴 실행 금지/타임아웃/리소스 제한 필수

AC
- Tools에서 호출 시 구조화된 JSON 반환(원본 URL/요약 포함)
- 정책 위반 시 차단/경고

---

## 6) 에이전트 설정 UI 활성화

- Agents 모드(우측 패널 또는 CenterStage 하위 페이지)에서:
  - 필드: 이름, 모델, 시스템 프롬프트, 기본 툴셋, 태그
  - CoT 기반 심층 사고 템플릿(샘플 프롬프트) 제공
  - 저장은 chatStore.ts upsertAgent 사용(로컬 영속)
- AC:
  - 신규/수정 에이전트를 즉시 스레드에 할당 가능하고, 시스템 프롬프트가 첫 메시지에 반영

---

## 7) Tauri 빌드 → Monaco/에이전틱 코딩 환경

프리플라이트
- Linux 의존성(webkit2gtk 4.1, libsoup 3.0) 확인
- tauri.conf.json/CLI 버전 호환/네트워크/FS 스코프 확인

dev/build 스모크
- 실패 시 Cargo/tauri.conf 수정 포인트 수집 → README/체크리스트 갱신

Monaco + Agentic
- 에디터 탭 + MCP FS(열기/저장) 연동
- “제안→패치→Diff→적용” 왕복 UX
- 전용 에이전트(코딩 모드) + 도구(web, fs, lint/format/plan)

AC
- Tauri 앱 실행/에디터 렌더/파일 열고 저장
- AI 제안을 안전 가드 내 적용 가능(옵션: 확인 대화상자)

---

## 8) 오늘·3일·7일 타임라인(관찰 가능한 AC)

- 오늘
  - [ ] 스냅샷 채팅 응답 경로 재확인(증거 블럭+응답) — 브라우저 수동 확인
  - [ ] 스레드 복구(Import Threads) 구현/검증 — Dev UI에 목록/열람 가능
  - [ ] 채팅 로직 복원(Recall→Gate→Reason→Record) 1차 적용 — 증거 블럭/기록 흐름 재현
- 3일
  - [ ] 파일 MCP 확장(fs.write/move/delete) — Tools 패널 수동 실행 OK
  - [ ] 웹 MCP 1차(web.fetch/web.scrape) — 화이트리스트 도메인에서 결과 수신
  - [ ] Agents 설정 페이지 — 생성/수정/할당 가능
- 7일
  - [ ] Tauri 프리플라이트/스모크 그린
  - [ ] Monaco + Agentic 코딩 환경 MVP — 파일 열고 저장 + 제안 반영

---

## 9) 체크포인트 기록(운영 SSOT)

- 파일: status/checkpoints/CKPT_72H_RUN.jsonl (Append-only; 서버 API로만 추가)
- 기록 규칙:
  - 필수 필드 5개 전송(run_id, scope, decision, next_step, evidence), 서버가 UTC 타임스탬프 추가
- 본 문서 기반 이행 시점에 맞춰 주요 결정/전환/완료를 즉시 기록

---

## 10) 가드레일/정책 요약

- 프로젝트 경계 원칙: /home/duksan/바탕화면/gumgang_meeting/ 내부에서만 파일 생성/수정/실행
- 쓰기 제외: .git/**, node_modules/**, __pycache__/**, dist/**, build/**
- ST‑1206(UI) 수용 기준:
  - 전역 스크롤 숨김(단순 모드), 정확히 2개 스크롤러, Grid 레이아웃 rows=auto minmax(0,1fr) auto,
    Composer 액션 마크업 유지, 콘솔 경고 0
- API 키 취급: .env로 주입(로그/응답에 노출 금지)

---

## 11) 작업 항목 체크리스트(요약)

- [ ] 스냅샷 경로 점검 및 백엔드 URL 확인(gg_backend_url)
- [ ] Import Threads 액션(Dev UI) 추가 → migrated_chat_store.json 적용
- [ ] Recall/Gate/Reason/Record 파이프라인 이식(A1Dev.jsx/send, chatStore.ts 보강)
- [ ] MCP 파일 도구 확장(fs.write/move/delete) + Tools 패널 연결
- [ ] MCP 웹 도구(web.fetch/web.scrape) 1차 + 화이트리스트 정책
- [ ] Agents 설정 페이지(시스템 프롬프트 CoT 템플릿)
- [ ] Tauri 프리플라이트/스모크/Monaco 활성화
- [ ] 체크포인트(결정/완료/전환) Append 기록

---

## 12) 부록 — 테스트 시나리오(발췌)

- 채팅(Dev UI)
  1) “금강 프로젝트 요약” 입력 → 증거 블럭(details) 1개 이상 표시
  2) 응답 스트리밍/단일 패치 완료 후 스레드/메모 기록 생성
- Tool Mode
  1) OpenAI 계열 모델 선택 + Tool Mode ON → /api/chat/toolcall 성공
  2) Claude/Gemini 선택 → Tool Mode 강제 OFF 배지 노출
- 파일 MCP
  1) fs.write로 status/tmp/hello.txt 생성(ensureDirs: true)
  2) fs.move로 다른 폴더로 이동 → fs.read로 내용 확인 → fs.delete로 삭제
- 웹 MCP
  1) web.fetch(md 문서) → 길이/타입 제한 내 수신
  2) web.scrape(공식 문서 페이지) → selector로 텍스트/링크 목록 추출
- Agents
  1) 신규 Agent 생성(CoT 템플릿) → 스레드에 지정 → 시스템 프롬프트 반영 확인
- Tauri/Monaco
  1) 앱 실행 → 파일 열기/저장 → 변경 로그 확인

---

본 문서는 Dev UI 마이그레이션과 채팅 로직 복원을 위한 실행 합의서이며, 승인 후 순차적으로 시행하고 결과를 체크포인트 원장(SSOT)에 기록한다.
