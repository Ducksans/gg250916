# MASTER_EXECUTION_TIMELINE — 실행 순서표

> 참조 문서: [[status/plans/MASTER_EXECUTION_PLAN.md]], [[status/tasks/MASTER_EXECUTION_INSTRUCTIONS.md]], [[reports/MASTER_ALIGNMENT_REPORT.md]]

## 1. 타임라인 개요 (D0 기준)

| 실행 차수 | 시간 박스 | 대상(BT/ST)         | 선행 조건                       | 산출물                                                    | 승인/검증                       |
| --------- | --------- | ------------------- | ------------------------------- | --------------------------------------------------------- | ------------------------------- |
| 1         | D0 (금일) | ST0101              | MASTER_DOC/ CODE AUDIT 수신     | `reports/TBD_sendPipeline_audit.md`                       | Agent 자가 검토                 |
| 2         | D0~D1     | **ST0102**          | 차수1 완료, deps 설치 완료      | `scripts/ci/st0102_runner.sh`, guard/build 로그           | Agent 실행 → 5175 프리뷰 요청   |
| 3         | D1        | 승인 라운드         | ST0102 dist/로그 준비           | 5175 프리뷰, `status/evidence/ui/preview_*.png`           | Human 승인 → 5173 배포 지시     |
| 4         | D1~D2     | ST0103              | ST0102 승인, thread 데이터 확보 | Dev UI thread import 기능, evidence 로그                  | Agent 실행, lint/test 통과      |
| 5         | D2~D3     | ST-0603/0604        | ST0103 결과 반영                | `status/design/roadmap_BT07_BT10.md`, backend 스키마 초안 | Human 리뷰 후 문서 승인         |
| 6         | D3~D4     | ST-0605/0606        | 차수5 문서 승인                 | Bridge 계약 문서 + UI 통합 초안                           | Agent/Human 공동 리뷰           |
| 7         | D4~D5     | ST-0607/0608        | 차수6 완료                      | 테스트 계획, 리스크 레지스터                              | Human 승인, RUNBOOK 리스크 갱신 |
| 8         | D5        | ST-0609             | 모든 선행 문서 승인             | 업데이트된 [[status/tasks/BT-06_backlog.md]]              | Agent 정리 → Human 확인         |
| 9         | 지속      | 체크포인트 & 리포트 | 각 차수 완료                    | CKPT Append, 보고서 업데이트                              | Agent 작성, Human 서명          |

## 2. 승인 프로세스 세부

1. **5175 프리뷰 → 5173 배포**
   - ST0102 실행 후 Agent가 5175 포트 열람 링크 공유.
   - Human이 UI/기능 확인 → 승인 시 5173 배포 명령(`npm run deploy:5173`), 반려 시 수정 이유를 [[status/catalog/MASTER_RUNBOOK.md]] “의사결정 대기”에 기록.
   - 승인/반려 결과는 `status/checkpoints/CKPT_72H_RUN.jsonl`에 Append.
2. **문서 승인**
   - ST-0603~0609 산출물은 Obsidian 리뷰(Reading view) 후 Human이 “Approved” 주석 추가.
   - 승인 시 Dataview 인덱스(SSOT_SITEMAP)에서 상태 확인.
3. **리스크/테스트 계획**
   - ST-0607/0608 결과는 MASTER_RUNBOOK 리스크 섹션과 CI Runner 체크리스트에 반영.

## 3. 선행 조건 체크리스트

- [ ] Node/PNPM 의존성 설치 (`npm install` in `ui/dev_a1_vite/`).
- [ ] Python venv 초기화 (`./scripts/dev_backend.sh init`).
- [ ] Bridge 서버 점검 (`node bridge/server.js` → health OK).
- [ ] QUARANTINE 정책 재확인, 실행 승인 여부 결정.
- [ ] Dataview/Obsidian 환경 준비 (`phase` 필드 확인).

## 4. 타임라인 변경 관리

- 변경 제안은 [[AGENTS.md]] PLAN 절차에 따라 `변경 전→변경 후` 형태로 제시.
- 승인된 변경은 본 문서와 [[status/plans/MASTER_EXECUTION_PLAN.md]]에 즉시 반영, 업데이트 시각 기록.
- 대규모 일정 조정 시 [[reports/MASTER_ALIGNMENT_REPORT.md]] 업데이트 후 Human 승인 필수.

## 5. 체크포인트 & 보고 일정

| 시점             | 기록 위치                                                         | 내용                                           |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| 각 차수 종료     | `status/checkpoints/CKPT_72H_RUN.jsonl`                           | `run_id`, `decision`, `evidence` 필수          |
| D2, D5           | [[status/catalog/MASTER_RUNBOOK.md]]                              | “오늘의 상태 요약”/“다음 행동” 갱신            |
| 주간             | [[AGENTS_log.md]]                                                 | 게이트 체크리스트 업데이트, Dataview 결과 공유 |
| 마일스톤 완료 시 | [[reports/MASTER_CODE_AUDIT.md]], [[reports/MASTER_DOC_AUDIT.md]] | 감사 보고서 보강 또는 별도 추적                |
