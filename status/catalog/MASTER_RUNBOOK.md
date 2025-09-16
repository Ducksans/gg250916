---
timestamp:
  utc: 2025-09-16T07:13Z
  kst: 2025-09-16 16:13
author: Codex (AI Agent)
summary: 금강 프로젝트 상태를 한 문서에서 파악하기 위한 마스터 러너북
document_type: master_runbook
tags:
  - #master
  - #runbook
  - #ssot
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
phase: present
---

# MASTER_RUNBOOK — 금강 프로젝트 단일 대시보드

> 이 문서 한 곳에서 현재 상태, 다음 실행, 결정 대기 항목을 확인합니다. 세부 문서는 링크/Dataview 테이블로 자동 연결되며, 에이전트는 각 링크에서 필요한 작업을 수행합니다.

## 1. 오늘의 상태 요약
- **최신 체크포인트:** `status/checkpoints/CKPT_72H_RUN.jsonl` (마지막 항목 확인)
- **현재 BT/ST:** Dataview 표 참고. 완료 시 `phase` 갱신 후 체크포인트 Append 필수.
- **주요 위험/의존성:**
  - Anthropic tool_use 에러(400) → ST0201에서 추적 예정
  - CI Runner 템플릿 미작성 → T5 선행 필요

## 1-1. 금강 마스터 레이어
> 발원문과 다섯 핵심 운영 문서가 모든 부산물의 기준입니다. 이 여섯 문서만 읽어도 전체 프로젝트 방향을 복구할 수 있습니다.

| 계층 | 문서 | 역할 |
| --- | --- | --- |
| 발원 | [[docs/0_0_금강 발원문 원본.md]] | 금강 프로젝트 설립 선언문, 에이전트의 목적과 윤리, "금강"의 본질 규정 |
| 설계 허브 | [[AGENTS.md]] | 상호작용 규칙, PLAN→PATCH→PROVE 루프, Obsidian 가드 |
| 설계 확장 | [[AGENTS_expand.md]] | 프로젝트 설계서 → 작업 계획서 → 작업 지시서 구조 및 번호 체계 |
| 설계 로그 | [[AGENTS_log.md]] | 문서 관리 게이트, Dataview 규칙, 메타데이터 가이드 |
| 실행 계획 | [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md]] | Dev UI 복구/채팅 로직 실행 로드맵 |
| 미래 로드맵 | [[status/roadmap/BT11_to_BT21_Compass_ko.md]] | BT11~BT21 중장기 계획, 다음 단계의 나침반 |

> 다른 문서가 업데이트되더라도 반드시 위 여섯 문서에 근거가 있어야 하며, 변화가 생기면 여기에서 링크/요약을 갱신합니다.

## 2. 현재 진행 중 문서 (phase: present)
```dataview
TABLE file.link AS Doc, summary
FROM "status"
WHERE phase = "present"
SORT file.name ASC
```

## 3. 다음 행동 (Active ST)
```dataview
TABLE file.link AS Doc, ST, summary
FROM "status"
WHERE contains(tags, "#tasks") OR startswith(ST, "ST1")
SORT file.name ASC
```
> 새 작업은 `BT11~BT21` 번호 체계를 사용. 필요 시 `status/tasks/`에 세부 지시서 작성.

### CI Runner 타임라인
1. **ST0102** — [[status/tasks/ST0102_dev_ui_ci_checklist.md]] 실행. Runner로 Dev UI 빌드/검증, 5175 프리뷰 제공.
2. **사용자 검수** — 5175 포트 확인 후 승인/반려 결정. 승인 시 5173 배포를 지시.
3. **BT-06 ST-0603~0609** — 계획 문서 작성(로드맵, API 계약, 브리지 계약, UI 통합, 테스트 계획, 리스크) → 각각 `status/design/` 산출물로 연결.
4. **체크포인트 기록** — 각 단계 완료 후 `CKPT_72H_RUN.jsonl` Append + MASTER_RUNBOOK 요약 갱신.

## 4. 의사결정 대기 / 차단 이슈
- [ ] Anthropic tool_use 400 해결 전략 승인 필요 (문서: [[status/reports/2025-09-12_chating_thread_system_compare_report_between_GG&libre.md]])
- [ ] CI Runner 파이프라인 설계안 검토 (문서: [[status/tasks/BT-06_backlog.md]])

## 5. 참고 인덱스
- [[status/catalog/DOCS_PHASE_INDEX.md|DOCS_PHASE_INDEX]] — 과거/현재/미래 전체 목록
- [[status/catalog/SSOT_SITEMAP.md|SSOT_SITEMAP]] — 스펙/허브 링크
- [[AGENTS.md]] · [[AGENTS_expand.md]] · [[AGENTS_log.md]] — 에이전트 규약/게이트

## 6. 체크포인트 절차
1. 작업 완료 → 관련 문서 `phase` 업데이트 → 체크포인트 Append (`CKPT_72H_RUN.jsonl`).
2. `decision` 필드에 ST 번호 + 결과 요약, `evidence`에는 관련 문서 경로 명시.
3. MASTER_RUNBOOK의 상태 요약을 갱신.

## 7. 기록
- 마지막 실행 담당자와 시각을 마스터 문서 최상단 메타데이터에 유지합니다.
- 에이전트는 본 문서를 기준으로 필요한 세부 문서를 열람하고, 변경 사항은 반드시 링크된 문서에 반영 후 체크포인트 처리합니다.
