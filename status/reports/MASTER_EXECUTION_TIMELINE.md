---
timestamp:
  utc: 2025-09-18T05:20Z
  kst: 2025-09-18 14:20
author: Codex (AI Agent)
summary: North Star 4단계를 기준으로 단일 실행 타임라인과 주간 스프린트를 정리
document_type: master_timeline
tags:
  - #timeline
  - #execution
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# MASTER_EXECUTION_TIMELINE — 단일 실행 타임라인

> 북극성 문서([PROJECT_NORTH_STAR](../vision/PROJECT_NORTH_STAR.md))의 4단계 목표를 언제·어떻게 달성할지 주간 단위로 관리합니다. 과거 기록은 `status/archive/timeline/`으로 옮기고, 본 문서는 항상 “현재 진행형”만 유지합니다.

## 1. 단계별 로드맵

| 단계 | 핵심 미션 | 이번 주 목표 | 위험·의존성 | 상태 |
| --- | --- | --- | --- | --- |
| 1. 코딩 에이전트 UI 완성 | ST‑06 계열 UI 안정화 + PG/증거 체계 정비 | PG 인게스트 검증, Evidence 링크 404 해결, UI 토글 잠금 | Legacy thread ID 정합, Postgres 접속 상태 | 🔄 진행 중 |
| 2. 오케스트레이션 허브 | Planner/Executor 갖춘 허브화 | Stage 1 완료 후 착수 | Stage 1 산출물 | ⏳ 대기 |
| 3. 콘텐츠 자동화 파이프라인 | Content v2 → 자동화 | Stage 2 완료 후 설계 | 파이프라인 스펙 재정비 | ⏳ 대기 |
| 4. 정본 배포 & 채널 운영 | 허브→SNS/블로그 배포 | Stage 3 완료 후 롤아웃 | 채널 계약/계정 | ⏳ 대기 |

## 2. 주간 스프린트 보드 (2025-W38)

- **Sprint Goal:** 금강 UI Stage 1 마무리 — PG 연동 + Evidence 링크 정상화 + UI 토글 잠금
- **기간:** 2025-09-18 ~ 2025-09-24

| 우선순위 | 작업 | 담당 | 완료 기준 | 상태 |
| --- | --- | --- | --- | --- |
| P0 | Evidence fallback 모니터링 자동화 | Agent | 지표 정의 + 로그 요약 자동화 초안 + CKPT | ☑ |
| P0 | Stage 2 Kickoff 자료 패키징 | Agent | 슬라이드/증거 링크 정리 + 공유 계획 | ☑ |
| P1 | MCP PySpark 래퍼 초안 | Agent | `scripts/mcp/pyspark_execute.py` 작성 + README 업데이트 | ☑ |
| P0 | IDE Shell Phase 1 | Agent | /ui-dev/ide 라우트 + 3분할 셸 + 리사이저/단축키/컴포저 + 리사이즈 검증 | ☑ |
| P0 | IDE Shell Phase 1.5 | Agent | Global Home=IDE, 전환 단축키(1/2), 패널 토글(B/J), 프리셋, Task History 골격 | ☐ |
| P1 | IDE Shell Phase 2 | Agent | 세션 복원, 분할 에디터, 저장(Tauri FS), 빠른 열기 강화 | ☐ |

> 상태 기호: ☑ 완료 · ☐ 진행 중 · ⧖ 대기 · ⚠ 위험

## 3. 일일 동기화 루틴
1. README 체크리스트 → Control Tower 문서(README, North Star, Timeline, Runbook, SSOT) 순으로 열람
2. Runbook “오늘의 3대 작업”을 본 스프린트 보드에서 선택해 채운다
3. 작업 완료 시 Runbook과 CKPT를 업데이트한 뒤, 스프린트 보드 상태(☐→☑)를 갱신한다

## 4. 다음 마일스톤 미리보기
- [ ] Stage 1 종료 보고(증거 링크 + CKPT) → Stage 2 kickoff 브리핑
- [ ] Stage 2 착수 시 Planner/Executor 설계 워크숍 문서 작성
- [ ] Stage 3을 대비해 Content Pipeline 스펙 재검토 (BT‑07 시리즈)

## 5. 아카이브 규칙
- 완료된 스프린트 보드는 `status/archive/timeline/` 폴더에 날짜 기준 복사 후 본문에서 제거합니다.
- 북극성 표의 “현재 상태”를 변경할 때는 CKPT에 동일 run_id를 남기고 링크합니다.

> 질문이 생기면 “이 작업이 어떤 Stage를 전진시키는가?”를 먼저 확인하고, 해당 Stage의 우선순위에 따라 행동합니다.
