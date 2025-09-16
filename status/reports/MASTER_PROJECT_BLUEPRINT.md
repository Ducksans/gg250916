# MASTER_PROJECT_BLUEPRINT — 금강 마스터 청사진

> 본 청사진은 [[docs/0_0_금강 발원문 원본.md]]과 [[AGENTS.md]] 계열 지침을 상위로 삼아, 실행 계획([[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]])과 중장기 나침반([[status/roadmap/BT11_to_BT21_Compass_ko.md]])을 잇는 최상위 문서입니다.

## 1. 비전과 목표

1. **발원 사명** — 듀얼 브레인 공존과 메모리·추론 강화([[docs/0_0_금강 발원문 원본.md]]). 모든 기능은 "인간-에이전트 협력"을 가속하는 방향으로 설계한다.
2. **운용 원칙** — PLAN→PATCH→PROVE 루프([[AGENTS.md]])에 따라 요청을 분석하고, 승인된 범위 내에서만 변경한다.
3. **핵심 목표**
   - Dev UI(A1, Vite)에서 기억·증거·기록 파이프라인을 복원하고([[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]]),
   - CI Runner(ST0102)를 통해 5175 프리뷰→사용자 승인→5173 배포 흐름을 자동화하며([[status/tasks/ST0102_dev_ui_ci_checklist.md]]),
   - BT-06 ST-0603~0609 문서/계약을 마련해 후속 BT 로드맵(07~10)과 교차 팀 협업 기반을 마련한다([[status/tasks/BT-06_backlog.md]]).

## 2. 운영 원리

- **시간 규약** — 모든 문서는 [[status/catalog/DOCS_PHASE_INDEX.md]]와 [[status/reports/GG_TIME_SPEC_V1.md]]를 준수, `phase: present` 상태에서 실행 중임을 명시한다.
- **문서 계층** — 설계서→계획서→지시서 흐름은 [[AGENTS_expand.md]]의 Tree 정의를 따른다. 청사진은 설계서 최상위.
- **CI 루프** — 5175 프리뷰가 PASS하면 사용자 승인 후 5173 배포, 체크포인트(`status/checkpoints/CKPT_72H_RUN.jsonl`)에 ST0102 결과를 기록한다.
- **가드 게이트** — [[AGENTS_log.md]] 문서 게이트를 통해 메타데이터/태그를 검증하고, [[rules/ai/ST-1206.ui.rules.md]]로 UI 규칙을 강제한다.

## 3. 가드레일 요약

| 구분      | 내용                                                                    | 근거                                                                                 |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 기술 가드 | 두 스크롤러(#gg-threads/#chat-msgs), grid rows 유지, Composer 마커 유지 | [[rules/ai/ST-1206.ui.rules.md]], [[scripts/check_ui_guardrails.cjs]]                |
| 환경 가드 | 프로젝트 루트 밖/`node_modules`/`.git` 등 수정 금지, 비밀키 노출 금지   | [[AGENTS.md]]                                                                        |
| 승인 가드 | 5175 프리뷰 → 사용자 승인 → 5173 배포, 실패 시 의사결정 대기            | [[status/catalog/MASTER_RUNBOOK.md]], [[status/tasks/ST0102_dev_ui_ci_checklist.md]] |
| 격리 가드 | QUARANTINE 경로 미참조, 실행 시 체크포인트 기록                         | [[QUARANTINE/QUARANTINE.md]]                                                         |
| 시간/메타 | `timestamp`, `phase`, `DOCS_TIME_SPEC` 필수                             | [[AGENTS_log.md]]                                                                    |

## 4. 핵심 용어 정의

| 용어                  | 정의                                                                               | 출처                                                        |
| --------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **BT-06**             | 설계/계획 재정비를 담당하는 Big Task. ST-0603~0609 문서 생성을 포함.               | [[status/tasks/BT-06_ST-0602.md]]                           |
| **ST0102**            | Dev UI CI Runner 체크리스트. lint→test→build→guard→5175 프리뷰 → 승인 → 5173 배포. | [[status/tasks/ST0102_dev_ui_ci_checklist.md]]              |
| **DYN 블록**          | Obsidian Dynamic Block. 시간/상태 자동 삽입 템플릿.                                | [[status/reports/GG_DYNAMIC_BLOCKS_SPEC.md]]                |
| **SSOT**              | Single Source of Truth. 프로젝트 전역 기준 문서 묶음.                              | [[docs/1_SSOT_개념.md]], [[status/catalog/SSOT_SITEMAP.md]] |
| **CI Runner(ST0102)** | Dev UI 파이프라인을 자동 검증하는 Runner. 증거는 `status/evidence/ui/`에 보관.     | [[status/tasks/ST0102_dev_ui_ci_checklist.md]]              |

## 5. 우선순위 및 트랙

1. **T1 — Dev UI 복원**: 스레드 임포트, sendPipeline 모듈화, ST0102 Runner 완비. 산출물은 `ui/dev_a1_vite/` 코드 + guard evidence.
2. **T2 — 문서 정렬**: BT-06 ST-0603~0609 문서 작성, 레거시 docs/projects 메타데이터 보강, Dataview 인덱스 복구.
3. **T3 — 운영/격리**: QUARANTINE 실행 준비, legacy 스크립트 안전장치 추가, 체크포인트 자동화.

## 6. 참고 마스터 문서

- 발원문: [[docs/0_0_금강 발원문 원본.md]]
- 에이전트 규약: [[AGENTS.md]], [[AGENTS_expand.md]], [[AGENTS_log.md]]
- 실행 계획: [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]], [[status/catalog/MASTER_RUNBOOK.md]]
- 로드맵: [[status/roadmap/BT11_to_BT21_Compass_ko.md]]
- 정합 보고: [[reports/MASTER_DOC_AUDIT.md]], [[reports/MASTER_CODE_AUDIT.md]], [[reports/MASTER_ALIGNMENT_REPORT.md]]
