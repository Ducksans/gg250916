# MASTER_DOC_AUDIT — 금강 프로젝트 문서 계층 감사

> 범위: `docs/`, `status/`, `tasks/`, `rules/`, `projects/`, `README.md`, `QUARANTINE/QUARANTINE.md` 및 마스터 레이어 문서 일곱 개.

## 1. 마스터 레이어 스냅샷

- [[docs/0_0_금강 발원문 원본.md]] — 프로젝트 존재 이유와 윤리, 듀얼 브레인 철학을 규정하는 발원 계층.
- [[AGENTS.md]], [[AGENTS_expand.md]], [[AGENTS_log.md]] — PLAN→PATCH→PROVE 루프, 문서 계층 규칙, Dataview 게이트를 정의한 설계 허브.
- [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]] — Dev UI 채팅 복구 실행 계획(현행 BT-01 중심)으로 작업 계획서 핵심.
- [[status/roadmap/BT11_to_BT21_Compass_ko.md]] — 중장기 BT11~BT21 나침반, 미래 계획서 상위 문서.
- [[status/catalog/MASTER_RUNBOOK.md]] — CI Runner 흐름(ST0102)과 BT-06 ST-0603~0609 일정이 연결된 운영 대시보드.

## 2. 문서 계층 매핑

| 문서                                                                 | 위치           | 계층                | 주요 내용/상태                                                                |
| -------------------------------------------------------------------- | -------------- | ------------------- | ----------------------------------------------------------------------------- |
| [[docs/0_0_금강 발원문 원본.md]]                                     | docs           | 설계(발원)          | 대서사·윤리 규범. 메타데이터 미구현 → 향후 YAML 헤더 필요.                    |
| [[docs/1_SSOT_개념.md]] 외 `docs/` 레거시 세트                       | docs           | 설계                | SSOT/기술 스택 철학 요약. 2023~2024 스타일, 메타데이터·phase 누락.            |
| [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]]           | status/reports | 작업 계획           | Dev UI 채팅 복원 단계, 포트/파이프라인 상세.                                  |
| [[status/tasks/ST0102_dev_ui_ci_checklist.md]]                       | status/tasks   | 작업 지시           | CI Runner 체크리스트. 5175 프리뷰→사용자 승인→5173 배포 명시.                 |
| [[status/tasks/BT-06_ST-0602.md]], [[status/tasks/BT-06_backlog.md]] | status/tasks   | 작업 계획/지시 혼합 | BT-06 산출물 정의와 ST-0603~0609 후속 작업 목록.                              |
| [[rules/ai/ST-1206.ui.rules.md]]                                     | rules/ai       | 가드레일            | UI 2 스크롤러 규칙. guard:ui와 직접 연계.                                     |
| [[projects/phase2_sample_note.md]]                                   | projects       | 설계 초안           | Phase 2 파일 검색 메모. YAML 헤더 미구현, 태그 없음.                          |
| [[task/ui_mvp_gate_checklist.md]]                                    | task           | 작업 지시           | 초기 UI 게이트 체크리스트. 디렉터리명이 `task/` 단수라 자동 인덱스 제외 위험. |
| [[QUARANTINE/QUARANTINE.md]]                                         | QUARANTINE     | 설계 보조           | 격리 정책 매니페스트. 실행 대기 상태 유지.                                    |
| [[README.md]]                                                        | 루트           | 요약/인수인계       | Dev UI 최근 변경 로그, 실행법. 메타데이터 없음(루트 문서 관행상 허용).        |

## 3. 누락·중복·정합 문제

1. **메타데이터 드리프트** — `docs/`와 `projects/` 대부분이 `phase`, `timestamp`, `DOCS_TIME_SPEC`를 포함하지 않아 Dataview 인덱스에 나타나지 않음.
2. **디렉터리 명명 일관성 부족** — `task/` 단수 폴더는 `status/tasks/`와 병행 운영되어 ST/BT 색인이 두 갈래로 분리됨.
3. **중복 설계 레이어** — `docs/0_금강 발원문.md`와 `0_0_금강 발원문 원본.md`가 내용이 겹치나 역할 정의가 불분명.
4. **계획-지시 단절** — BT-06 ST-0603~0609 문서 위치(`status/design/`)가 아직 미생성이라 MASTER_RUNBOOK의 CI Runner 후속 링크가 미해결 상태.
5. **격리 정책 미갱신** — QUARANTINE 매니페스트가 실행 미완료 상태로 남아 있고 체크포인트 연계 기록 부재.

## 4. 자동 인덱스 및 가드 상태 점검

- [[status/catalog/SSOT_SITEMAP.md]] — Dataview 쿼리는 최신(2025-09-16)이나 레거시 문서가 태그/phase 누락으로 표에 미출력.
- [[status/catalog/DOCS_PHASE_INDEX.md]] — `phase` 필드 기반이지만 과거 문서들이 `phase: past`로 재분류되지 않아 실질적으로 비어 있음.
- [[AGENTS_log.md]] 게이트 체크리스트는 존재하나 실행 로그(`status/logs/document_gate/`) 폴더 미생성 → 자동 감시 미동작 추정.
- `guard:ui`(ST-1206)와 연계된 [[scripts/check_ui_guardrails.cjs]]는 README와 일치, Dev UI 기준 유지. 문서 측 설명은 [[rules/ai/ST-1206.ui.rules.md]]로 연결됨.

## 5. 개선 제안 (우선순위 순)

1. **메타데이터 정비 스프린트** — `docs/`/`projects/` 레거시 문서에 표준 YAML 헤더 추가 → Dataview 및 MASTER_RUNBOOK 연동 회복.
2. **디렉터리 정렬** — `task/`를 `tasks/`로 승격하거나 MASTER_RUNBOOK에서 단수 폴더를 명시적으로 인덱싱하여 ST-0609 산출물과 일치.
3. **BT-06 산출물 생성** — ST-0603~0609 대상 문서를 `status/design/`에 신속 생성하고 MASTER_RUNBOOK 링크를 실체화.
4. **마스터 발원문 중복 해소** — `docs/0_금강 발원문.md`를 보조 요약본으로 명시하거나 통합 후 리다이렉트 링크만 남김.
5. **QUARANTINE 로그화** — 실행 시점 확정 전이라도 체크포인트 템플릿과 책임자 명시를 추가해 향후 조치에 대비.
6. **CI Runner 준비 자료** — [[status/tasks/ST0102_dev_ui_ci_checklist.md]]와 연동해 5175 프리뷰→승인→5173 배포 흐름을 문서 상단 Quick Steps로 요약하는 단일 페이지(예: `status/tasks/ST0102_summary.md`) 작성.
