# MASTER_EXECUTION_INSTRUCTIONS — 통합 실행 지시서

> 상위 참조: [[docs/MASTER_PROJECT_BLUEPRINT.md]], [[status/reports/MASTER_EXECUTION_PLAN.md]], [[status/reports/MASTER_ALIGNMENT_REPORT.md]]

## 1. 공통 준비 절차

1. [[AGENTS.md]] PLAN 단계에서 요청 범위/영향 문서 확인.
2. `git status`가 clean인지 확인 후 작업. 필요 시 `npm install`/`pip install` 수행.
3. 메타데이터 헤더(`phase`, `timestamp`, `DOCS_TIME_SPEC`)를 편집 전후 확인([[AGENTS_log.md]] 게이트).
4. 실행 중에는 QUARANTINE 경로를 참조/수정하지 않는다([[QUARANTINE/QUARANTINE.md]]).

## 2. 트랙 T1 — Dev UI & ST0102 Runner

| 단계 | 지시                        | 명령/경로                                                         | 테스트/증거                                                     | 담당  |
| ---- | --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| T1-1 | sendPipeline 현황 정리      | `ui/dev_a1_vite/src/features/chat/sendPipeline.ts` 리뷰           | `npm run lint -- --no-fix`                                      | Agent |
| T1-2 | ST0102 Runner 스크립트 작성 | `scripts/ci/st0102_runner.sh` 생성(권장)                          | `bash scripts/ci/st0102_runner.sh --dry-run`                    | Agent |
| T1-3 | Runner 실행 & evidence 수집 | `npm run lint/test/build/guard:ui` 체인                           | `status/evidence/ui/build_*.log`, `guardrails_*.log`            | Agent |
| T1-4 | 5175 프리뷰 검수 요청       | `npm run preview -- --host --port 5175`                           | 브라우저 확인, 스크린샷 저장 `status/evidence/ui/preview_*.png` | Human |
| T1-5 | 사용자 승인/반려 기록       | `status/checkpoints/CKPT_72H_RUN.jsonl` Append                    | JSON `{ "decision": "ST0102_APPROVED" }`                        | Human |
| T1-6 | 5173 배포(승인 시)          | `npm run deploy:5173`(가칭) 또는 `npm run preview -- --port 5173` | 서버 응답 체크, MASTER_RUNBOOK 업데이트                         | Human |

## 3. 트랙 T2 — 문서 정렬 & 메타데이터

| 단계 | 지시                                 | 경로                                 | 확인 방법                             | 담당  |
| ---- | ------------------------------------ | ------------------------------------ | ------------------------------------- | ----- |
| T2-1 | BT-06 ST-0603~0608 문서 초안 작성    | `status/design/*.md/.yaml`           | 메타데이터 포함 여부, Dataview 결과   | Agent |
| T2-2 | 레거시 docs/projects 메타데이터 보강 | `docs/*.md`, `projects/*.md`         | `rg "phase:" docs projects` 재확인    | Agent |
| T2-3 | MASTER_RUNBOOK 링크 갱신             | [[status/catalog/MASTER_RUNBOOK.md]] | “다음 행동”/“의사결정 대기” 섹션 수정 | Agent |
| T2-4 | AGENTS_log 게이트 로그 작성          | `status/logs/document_gate/` 신설    | Gate 체크리스트 완료 여부 기록        | Agent |

## 4. 트랙 T3 — 운영·격리·체크포인트

| 단계 | 지시                      | 경로/명령                               | 테스트/증거                                     | 담당  |
| ---- | ------------------------- | --------------------------------------- | ----------------------------------------------- | ----- |
| T3-1 | QUARANTINE 실행 승인 준비 | `QUARANTINE/QUARANTINE.md` 업데이트     | 담당자/체크포인트 템플릿 기입                   | Agent |
| T3-2 | Legacy 스크립트 가드 추가 | `gumgang_0_5/*.sh`                      | 실행 전 경고 echo 삽입                          | Agent |
| T3-3 | 체크포인트 Append 자동화  | `scripts/checkpoint_append.py` (신규)   | `python scripts/checkpoint_append.py --dry-run` | Agent |
| T3-4 | CI 실패 로그 보관         | `status/evidence/ui/logs/`              | 실패 시 로그 파일 생성 확인                     | Agent |
| T3-5 | HUMAN 승인 기록 검증      | `status/checkpoints/CKPT_72H_RUN.jsonl` | 승인 entry 존재 여부 확인                       | Human |

## 5. 테스트 및 검증 방법

- **UI**: `npm run lint`, `npm run test -- --watch=false`, `npm run build`, `npm run guard:ui`, `npm run preview -- --port 5175`.
- **백엔드**: `./scripts/dev_backend.sh health`, 필요한 경우 `./scripts/dev_backend.sh run`.
- **Bridge**: `node bridge/server.js`(백그라운드) → `curl -s http://127.0.0.1:3037/api/health` 확인.
- **Dataview**: Obsidian에서 `CMD+P → Dataview: Evaluate current file`.
- **Checkpoints**: `jq -r 'tail -n 1' status/checkpoints/CKPT_72H_RUN.jsonl`(jq 없으면 `tail`).

## 6. 역할 분담

- **Agent**: 코드 작성, 문서 초안, 자동화 스크립트 개발, Runner 실행, evidence 수집.
- **Human Operator**: 5175 프리뷰 UI 검수, 5173 배포 승인/반려 결정, 체크포인트 서명, 전략적 우선순위 변경 승인.

## 7. 승인·보고 체계

1. 각 단계 완료 후 [[status/checkpoints/CKPT_72H_RUN.jsonl]] Append.
2. 승인 또는 차단 사유는 [[status/catalog/MASTER_RUNBOOK.md]] “의사결정 대기”에 기록.
3. 문서 정렬 변경은 [[AGENTS_log.md]] Gate 로그에 체크 후, [[reports/MASTER_ALIGNMENT_REPORT.md]]에 반영.
4. 최종 보고는 [[reports/MASTER_CODE_AUDIT.md]]/[[reports/MASTER_DOC_AUDIT.md]] 업데이트 또는 Follow-up 보고로 제출.
