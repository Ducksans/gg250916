# MASTER_CODE_AUDIT — 금강 프로젝트 코드/자동화 감사

> 범위: `ui/`, `app/`, `bridge/`, `scripts/`, `gumgang_0_5/` 등 코드 및 CI 스크립트 전반.

## 1. 스택 구조 요약

### 1.1 프런트엔드 — Dev UI (Vite, React)

- 경로: `ui/dev_a1_vite/`. [[ui/dev_a1_vite/src/components/A1Dev.jsx]]가 최상위 컨테이너로 스레드/증거/도구 모드를 모두 책임.
- 상태 저장소: [[ui/dev_a1_vite/src/state/chatStore.ts]] (로컬스토리지 초기화, 에이전트/스레드/메시지 액션). `waitForInit()` 기반으로 SPA 부팅.
- Guardrails: [[ui/dev_a1_vite/src/guard/sgmGate.ts]]가 질의/증거 점수 기반 엄격 게이트. CSS 스크롤 제한은 [[scripts/check_ui_guardrails.cjs]]로 검증.
- 빌드 체인: `npm run lint|test|build|guard:ui`(package.json). base URL `/ui-dev/`, Proxy `/api`→8000, `/bridge`→3037.

### 1.2 백엔드 — FastAPI (BT-10)

- 엔트리포인트: [[app/api.py]] — 회의 캡처/메모/첨부 저장 API, 감사 로그(Append JSONL) 내장.
- 오케스트레이터: [[app/api_orch.py]] + [[app/orch/engine.py]]로 in-process run 시뮬레이터 제공(Queue→Step→Success), 향후 외부 워커 연계 예상.
- 검색 모듈: [[app/search/file_retriever_v0.py]] — 화이트리스트 기반 파일 검색, Phase 2 opt-in(환경변수 `FILE_RETRIEVER_ENABLED`).
- 실행 스크립트: [[scripts/dev_backend.sh]] — venv 생성/실행/헬스/프리징. `RELOAD_DIRS`, `RELOAD_EXCLUDE` 파라미터로 안전 제어.

### 1.3 브리지/MCP 계층

- Node HTTP 브리지: [[bridge/server.js]] — `/api/chat` OpenAI 프록시, 파일 시스템 allowlist, Tool Mode 캐싱. 정적 UI(`/ui/*`) 및 대화 로그 저장.
- 운영 README: [[bridge/README.md]] — 허용 루트·헬스·예제 curl. 포트 3037 고정.
- MCP 도구 확장 계획은 EXEC_PLAN과 [[status/tasks/BT-06_backlog.md]]에서 정의되었으나 코드 측 구현은 브리지 서버에 부분적으로만 존재.

### 1.4 레거시/보조 자산

- `gumgang_0_5/` — 과거 버전 스크립트·테스트·메모리 덤프. 자동 실행/크론 스크립트 다수(`start_gumgang.sh`, `monitor_backend_cron.sh`). 현재 프로젝트에서는 참조만 허용(QUARANTINE 계획).
- `start_servers.sh` & `scripts/dev_all*.sh` — tmux 기반 멀티 서버 부팅. README 최신 로그와 동일 흐름 유지.

## 2. CI Runner & Guardrails 흐름

1. **ST0102 파이프라인** ([[status/tasks/ST0102_dev_ui_ci_checklist.md]])
   - `npm run lint → test → build → guard:ui` 순. dist 산출물(5175 프리뷰) → 사용자 승인 → 5173 배포.
   - 증거 경로: `ui/dev_a1_vite/dist/`, `status/evidence/ui/…`.
2. **5175 Last-Green 미리보기** ([[scripts/watch_last_green.sh]])
   - Git worktree를 `last-green` 태그로 생성, 필요 시 Vite dev server(5175) 실행. 안전 가드(경로 suffix `_last_green`, allowlist) 적용.
3. **가드레일 검사** ([[scripts/check_ui_guardrails.cjs]], [[rules/ai/ST-1206.ui.rules.md]])
   - CSS grid/스크롤 컨테이너 검사, Composer 마커 확인. 실패 시 exit 1, Guard Alert 형식 준수.
4. **백엔드 헬스/프리징** ([[scripts/dev_backend.sh]])
   - `./scripts/dev_backend.sh health`로 8000 상태 체크, `freeze`는 `status/evidence/packaging/`에 pip freeze 저장.
5. **자동화 공백**
   - `scripts/ci/` 디렉터리 부재, `run_preview_and_test.sh` 등 하네스는 문서에만 언급되고 구현되지 않음 → CI Runner 완전 자동화 전환 미완.

## 3. 알려진 문제 및 기술 부채

1. **A1Dev.jsx 과밀** — 400+ 라인 모놀리식 컨테이너. 계획서는 sendChat 파이프라인 모듈화를 요구하나 실제 분리는 진행 중.
2. **Bridge OpenAI 의존** — `/api/chat`이 OpenAI Chat Completions에 하드 의존(ENV 키 필요). 오프라인/대체 모델 fallback 미비.
3. **File Retriever Opt-in** — Phase 2 기능이 코드에 존재하나 `FILE_RETRIEVER_ENABLED` 기본 false로 비활성. 문서 대비 실제 통합 전.
4. **Legacy Scripts Drift** — `gumgang_0_5` 내 `run-tests.sh`, cron 스크립트 등이 최신 SSOT와 불일치. QUARANTINE 계획으로 이동 필요.
5. **Guardrails Evidence 누락** — `guard:ui` 성공 여부를 저장할 표준 경로(`status/evidence/ui_guard/`)가 정의되지 않아 반복 검증 시 추적 어려움.
6. **CI Runner Stub** — README/EXEC_PLAN에서 언급한 “5175 프리뷰 자동 배포 스텁(run_preview_and_test.sh)”이 저장소에 없어 문서-코드 괴리.

## 4. 설계 ↔ 구현 어긋남

| 기대(문서)                                                            | 현재 코드                                                                                      | 영향                                                  | 권장 조치                                                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| EXEC_PLAN 2단계 “스레드 복구” — chatStore.ts에 마이그레이션 로직 명시 | chatStore.ts에 Import/마이그레이션 훅 없음, `migrated_chat_store.json` 경로만 계획 문서에 존재 | Dev UI 좌측 스레드가 기본 샘플에 제한                 | `ui/dev_a1_vite/src/state`에 import 함수 추가, 브리지 MCP 연동 구현                                    |
| BT-06 ST-0604~0608 문서 기반 API/브리지 계약                          | 코드에 해당 스키마 정의 없음                                                                   | API/브리지 계약 미동기화 → 추후 통합 시 리그레션 위험 | `status/design/` 산출물 작성 후 FastAPI/Bridge에 pydantic/TS 타입 반영                                 |
| ST0102 체크리스트 Step 3 “UI Guardrails evidence”                     | guard 스크립트만 존재, evidence 디렉터리 미설계                                                | Runner에서 증거 링크 남기기 어려움                    | `npm run guard:ui` 후 로그를 `status/evidence/ui/guardrails_YYYYMMDD.log`에 저장하도록 npm script 보완 |
| 5175→승인→5173 배포 자동화                                            | `watch_last_green.sh` worktree 준비까지만 구현                                                 | 사용자 승인 후 실제 배포(5173) 수동 의존              | preview worktree에서 `npm run preview` 후 승인 이벤트를 체크포인트에 기록하는 스크립트 신설            |

## 5. 다음 단계 제안

1. **sendPipeline 모듈화** — [[ui/dev_a1_vite/src/features/chat/sendPipeline.ts]] 확장 및 A1Dev.jsx 의존도 축소. 테스트 가능한 유닛 함수 분리.
2. **CI Runner 스크립트화** — `scripts/ci/st0102_runner.sh` 생성: lint/test/build/guard 실행 + dist 아카이브 + evidence 기록.
3. **Evidence 경로 표준** — Guard/Build 결과를 `status/evidence/ui/` 하위로 규격화, MASTER_RUNBOOK 링크 갱신.
4. **Bridge 대체 모델 후킹** — ENV 기반 모델 스위치(Anthropic/Gemini) stub 추가, tool mode 차단 로직과 일치.
5. **Legacy 격리 실행** — QUARANTINE 계획 승인 시 `gumgang_0_5` 실행 스크립트 이동 및 README에 링크만 유지.
6. **ST-0603~0609 구현 착수** — BT-06 설계 문서 생성 후 FastAPI/Bridge/Dev UI에 stub 코드 배치해 문서-코드 정합 확보.
