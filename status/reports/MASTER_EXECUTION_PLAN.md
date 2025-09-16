# MASTER_EXECUTION_PLAN — 실행 전략 지도

> 상위 참조: [[docs/MASTER_PROJECT_BLUEPRINT.md]], [[status/catalog/MASTER_RUNBOOK.md]], [[reports/MASTER_ALIGNMENT_REPORT.md]]

## 1. BT/ST 구조

| 구분       | 설명                                 | 산출물                                           | 의존성                                                            | 증거                                          |
| ---------- | ------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------- |
| **BT-06**  | 문서/코드 정합 회복 및 로드맵 재정렬 | [[status/tasks/BT-06_backlog.md]]                | [[reports/MASTER_DOC_AUDIT.md]], [[reports/MASTER_CODE_AUDIT.md]] | `status/design/*`, `status/tasks/*`           |
| ST0101     | Dev UI sendPipeline 현황 조사        | `reports/TBD_sendPipeline_audit.md` (신규)       | EXEC_PLAN §2                                                      | `ui/dev_a1_vite/src/features/chat` 로그       |
| **ST0102** | Dev UI CI Runner 구축                | [[status/tasks/ST0102_dev_ui_ci_checklist.md]]   | ST0101                                                            | `ui/dev_a1_vite/dist/`, `status/evidence/ui/` |
| ST0103     | Thread import 모듈 구현              | `ui/dev_a1_vite/src/state/chatStore.ts` 패치     | ST0102                                                            | `status/evidence/ui/thread_import.log`        |
| ST-0603    | BT07~10 로드맵 초안                  | `status/design/roadmap_BT07_BT10.md`             | ST0102, ST0103                                                    | `status/design/`                              |
| ST-0604    | 백엔드 검색/채팅 계약                | `status/design/backend_semantic_search_api.yaml` | ST-0603                                                           | `app/api.py`, `app/search/`                   |
| ST-0605    | 브리지 계약                          | `status/design/bridge_contract.md`               | ST-0603                                                           | `bridge/server.js`                            |
| ST-0606    | UI 통합 설계                         | `status/design/ui_integration.md`                | ST0103, ST-0605                                                   | `ui/dev_a1_vite/`                             |
| ST-0607    | 테스트 계획                          | `status/design/test_plan.md`                     | ST0102, ST0103                                                    | `scripts/tests/`                              |
| ST-0608    | 리스크 레지스터                      | `status/design/risks.md`                         | ST0102                                                            | `status/design/`                              |
| ST-0609    | 백로그 표 정리                       | [[status/tasks/BT-06_backlog.md]] 업데이트       | ST-0603~0608                                                      | `status/tasks/`                               |

## 2. 의존성 요약

1. **Runner 선행** — ST0102가 Guard evidence 경로·체크포인트 포맷을 확정해야 ST0103~ST-0607 테스트 흐름이 안정된다.
2. **문서-코드 페어링** — ST-0604/0605/0606는 문서 초안과 동시 코드 stub 작업이 필요([[reports/MASTER_ALIGNMENT_REPORT.md]]).
3. **5175 승인 루프** — 모든 UI 관련 작업은 5175 프리뷰→사용자 승인→5173 배포 규칙을 따르며 실패 시 MASTER_RUNBOOK “의사결정 대기” 섹션 업데이트.

## 3. 우선순위 및 마일스톤

1. **M1 — CI Runner Hardening (D+2)**
   - 작업: ST0102 Runner 스크립트, guard evidence 경로 확정, dist 아카이브 규격화.
   - 완료 기준: `npm run ci:st0102`(가칭) 성공, `status/evidence/ui/guardrails_YYYYMMDD.log` 기록, 체크포인트 Append.
2. **M2 — Thread Import & 문서 정렬 (D+5)**
   - 작업: ST0103 구현, BT-06 ST-0603~0606 문서 초안 작성, Dataview 인덱스 복구.
   - 완료 기준: Dev UI 스레드 목록에 마이그레이션 결과 표시, `status/design/roadmap_BT07_BT10.md` 초안 PR.
3. **M3 — 테스트 & 리스크 패키지 (D+7)**
   - 작업: ST-0607 테스트 계획, ST-0608 리스크 레지스터, `scripts/tests/` skeleton.
   - 완료 기준: CI Runner에 시나리오 매핑, MASTER_RUNBOOK 리스크 표 갱신.

## 4. CI Runner 연동 전략

- **명령 체계**: `npm run lint` → `npm run test -- --watch=false` → `npm run build` → `npm run guard:ui` → `npm run ci:bundle`(dist zip) → `npm run ci:checkpoint`.
- **증거 규격**:
  - Build: `status/evidence/ui/build_{UTC}.log`
  - Guard: `status/evidence/ui/guardrails_{UTC}.log`
  - Preview 스크린샷: `status/evidence/ui/preview_{UTC}.png`
  - Checkpoint: `status/checkpoints/CKPT_72H_RUN.jsonl`에 ST0102 결정.
- **5175↔5173**: `scripts/watch_last_green.sh`로 last-green worktree 생성 → 승인 시 `npm run preview -- --host --port 5175` 종료 → `npm run deploy:5173`(가칭) 실행.
- **Fallback**: 실패 시 `status/catalog/MASTER_RUNBOOK.md` 4장 “의사결정 대기” 업데이트, evidence 링크 첨부.

## 5. 리스크 및 완화

| 리스크                 | 영향                 | 완화 전략                                                |
| ---------------------- | -------------------- | -------------------------------------------------------- |
| Guard evidence 누락    | Runner 신뢰도 저하   | npm script로 로그/아카이브 생성, MASTER_RUNBOOK에 링크   |
| Legacy 스크립트 재실행 | 환경 오염            | QUARANTINE 실행 전 `.rules` 경고 추가, 실행 로그 남김    |
| 메타데이터 누락        | Dataview 인덱스 붕괴 | ST-0609에서 메타데이터 보강 체크리스트 운영              |
| OpenAI API 실패        | CI/브리지 중단       | ENV fallback 준비, README에 대체 모델 스위치 계획 문서화 |

## 6. 승인 및 업데이트 절차

1. 계획 변경 제안은 [[AGENTS_log.md]] 게이트 체크 후 [[status/catalog/MASTER_RUNBOOK.md]] “다음 행동” 섹션 갱신.
2. 마일스톤 달성 시 [[status/checkpoints/CKPT_72H_RUN.jsonl]] Append + [[AGENTS_log.md]]에 Gate 통과 기록.
3. 계획 폐기/수정 시 [[reports/MASTER_ALIGNMENT_REPORT.md]] 업데이트 후 본 문서에서 참조 링크 갱신.
