---
timestamp:
  utc: 2025-09-16T06:57Z
  kst: 2025-09-16 15:57
author: Codex (AI Agent)
summary: Dev UI 복구 프로젝트의 단일 진실 기록, 과거/현재/미래 복구 경로 정리
document_type: restore_ssot
tags:
  - #restore
  - #ui
  - #ssot
BT: BT01_DevUI_채팅복원
ST: ST0101_UI_Restore_Baseline
RT: RT01_UI_Rebuild
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
phase: present
---

# UI 복원 작업 — SSOT (Single Source of Truth)

> 이 문서는 Dev UI 복구 작업의 기준선입니다. 스레드가 리부트되더라도 아래 순서만 따르면 같은 속도로 복구를 계속할 수 있습니다.

- **Owner:** Gumgang UI Restore 팀
- **복구 범위:** 스냅샷 HTML(3037) → Vite 기반 Dev UI(5173) 재구축 → Command Center 수준까지 확장
- **접속 경로:** Dev UI `http://localhost:5173/ui-dev/`, Bridge `http://localhost:3037/ui/`, FastAPI `http://127.0.0.1:8000`

---

## 0. 프로젝트 타임라인 요약
| 구간 | 기간/위치 | 핵심 결과물 | 비고 |
| --- | --- | --- | --- |
| 초기 설계 | `docs/` | 금강 UI 개념/요구사항 문서 | 프로젝트 루트 신설(맥락 정리 목적)
| 1차 시도 | `draft_docs/`, `ui/snapshots/` | 순수 HTML 스냅샷. 스크린샷 다수(`금강ui/스크린샷 …`) | 컴포넌트화 전 단계 완료
| LibreChat 벤치마킹 | (삭제됨) | React/Vite 컴포넌트 구조 분석 | 현재는 참조용 아카이브 제거
| 2차 시도 | `ui/dev_a1_vite/` | Dev UI 컴포넌트 기반 복구, Tool Mode/Right Drawer 도입 | 현행 기준선
| 복구 문서 정비 | `status/restore/UI_RESTORE_SSOT.md` | SSOT 문서. 체크포인트와 연결 | 현재 문서가 최신 버전

---

## 1. 현재 기준선 (2025-09-16)

### 1.1 백엔드/브릿지 상태
- FastAPI `/api/chat`, `/api/chat/stream`, `/api/chat/toolcall` 정상. MCP-Lite 도구(now/fs.read/web.search) 사용 가능.
- Anthropic(Claude) 플레인 호출은 성공. Dev UI에서 tool_use 조합 시 400 발생 → 추후 별도 ST로 처리.
- Bridge(3037) 헬스 OK. Dev UI와의 프록시 연동 유지.

### 1.2 Dev UI(A1 Vite) 상태
- 우측 패널(Planner/Insights/Executor/Agents/Prompts/Files/Bookmarks) 스켈레톤 탭 제공.
- 중앙 타임라인/컴포저 정중앙 정렬. `useComposerSpace` 훅으로 `--gg-composer-h` 발행.
- 타임라인 자동 바닥 고정(`useAutoStick`) + “현재로 이동” 버튼 구현.
- 메시지 표시를 블록형으로 전환, 역할 라벨 노출. Hover 액션(복사/삭제/핀/재실행) 작동.
- EdgeToggles(좌/우 패널 토글), Right Drawer 폭 관측(`--gg-right-pad`) 반영.
- ST‑1206 UI Guardrails 대부분 충족(두 스크롤러, grid rows, composer padding). 자동 체크 스크립트 필요.

### 1.3 CI Runner 전환 준비
- 병렬 디버깅 문제 해결을 위해 모든 빌드는 CI Runner로 수행 예정.
- ST 단위 빌드 → 가상환경(5175)에서 수동 검수 → 승인 시 메인 병합.
- Runner 템플릿은 `status/tasks/`에 ST별 체크리스트로 정리 예정.

---

## 2. 복구 트랙 & ST 매핑
| 트랙 | 설명 | 대표 ST | 산출물/검증 |
| --- | --- | --- | --- |
| T1. Dev UI 골격 복구 | A1 채팅 플로우와 패널 기본 UI 유지 | ST0101(현재 문서) → ST0104 | `ui/dev_a1_vite/src/**`, 스크린샷, ST‑1206 체크
| T2. Tool Mode & Provider 정합 | GPT/Claude 도구 사용 분리, 경고 배지 | ST0201 | `ui/dev_a1_vite/src/main.jsx`, Tool Manager 로그
| T3. MCP-Lite 안정화 | fs.read/write 등 도구 검증, 실패 시 경보 | ST0301 | API 응답, `scripts/mcp/*`
| T4. 스냅샷 ↔ Dev UI 동기화 | 구 스냅샷에서 디자인 요소 반영 | ST0401 | 비교 리포트, `ui/snapshots/**`
| T5. CI Runner 파이프라인 | Runner 스크립트, 승인 흐름 확립 | ST0501 | `.github/workflows/` 또는 `scripts/ci/**`

> 트랙 진행 시마다 `status/checkpoints/CKPT_72H_RUN.jsonl`에 `DOCS_TIME_SPEC` 버전과 함께 Append 합니다.

---

## 3. 실행 런북 (환경/명령)
| 대상 | 포트 | 시작 명령 | 헬스 체크 |
| --- | --- | --- | --- |
| FastAPI Backend | 8000 | `uvicorn app.api:app --reload --host 127.0.0.1 --port 8000` | `curl -s http://127.0.0.1:8000/api/health`
| Bridge | 3037 | `node bridge/server.js` | `curl -s http://127.0.0.1:3037/api/health`
| Dev UI | 5173 | `cd ui/dev_a1_vite && npm install && npm run dev` | 웹접속 `http://localhost:5173/ui-dev/`
| CI Runner (준비) | 5175 | Runner 템플릿 작성 예정 | 승인 체크리스트 참조

자주 사용하는 curl 예시는 기존 문서에서 유지하며, 필요할 때 참조합니다.

---

## 4. 증거(Evidence) 레퍼런스
- Dev UI 핵심 파일: `ui/dev_a1_vite/index.html`, `src/main.jsx`, `src/styles/a1.css`, `src/components/**`, `src/hooks/useComposerSpace.js`
- MCP/툴 연동: `gumgang_0_5/backend/app/api/routes/chat_gateway.py`, `scripts/mcp/*`
- Guardrails: `.rules`, `rules/ai/ST-1206.ui.rules.md`
- 체크포인트: `status/checkpoints/CKPT_72H_RUN.jsonl`

필요 시 세부 증거는 해당 ST 작업 문서에 추가로 기입합니다.

---

## 5. 즉시 실행할 1단계
- **ST0102 준비:** `status/tasks/`에 CI Runner 기준의 “Dev UI 복구 체크리스트” 노트를 생성하고, 현재 문서의 트랙 T1 항목을 ST별로 분해하세요. (템플릿 예시는 요청 시 제공)

완료 후에는 본 문서 상단 `ST` 값을 다음 단계로 갱신하고, 체크포인트에 기록합니다.
