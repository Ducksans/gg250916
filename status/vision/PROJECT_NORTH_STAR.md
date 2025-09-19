---
timestamp:
  utc: 2025-09-18T05:15Z
  kst: 2025-09-18 14:15
author: Codex (AI Agent)
summary: 금강 프로젝트의 절대 목표와 4단계 여정을 정의한 북극성 문서
document_type: project_vision
tags:
  - #vision
  - #northstar
BT: none
ST: none
RT: none
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# PROJECT NORTH STAR — 금강의 4단계 여정

> 이 문서는 금강 프로젝트의 변하지 않는 목적을 정의합니다. 모든 실행 문서(타임라인, 런북, 체크포인트)는 여기에서 선언한 4단계 목표를 달성하기 위한 수단으로 정렬합니다.

| 단계 | 미션 | 성공 기준 | 현재 상태 |
| --- | --- | --- | --- |
| 1. 금강 UI를 코딩 에이전트로 완성 | 대화형 UI가 FastAPI 단일 관문과 증거 시스템을 연결하고, ST 시나리오를 자율 실행 | BT‑06 UI 안정화 체크리스트 PASS, Evidence 토글/링크 정상, PG 연동 옵션 확보 | 진행 중 — PG 인게스트/ Evidence fallback 완료, Toolbar 정책 잠금 진행 |
| 2. 금강 UI를 오케스트레이션 허브로 승격 | UI가 백엔드·툴·파이프라인을 조율하는 중앙 허브가 됨 | Planner/Executor 패널, 워크플로우 트리거, 상태 모니터링 | 대기 |
| 3. 콘텐츠 자동화 파이프라인 가동 | 수집→가공→배포 준비까지 자동화된 파이프라인 가동 | Content Pipeline v2 실행, Evidence/로그 표준화 | 대기 |
| 4. 정본 업로드 & 채널 배포 | 허브에 정본을 저장하고, SNS/블로그 등 외부 채널에 배포하여 트래픽 창출 | 배포 계정 연동, KPI 대시보드, 재배포 스케줄링 | 대기 |

## 운영 원칙
- 단일 타임라인(`MASTER_EXECUTION_TIMELINE.md`)은 위 단계에 맞춰 주간/스프린트 계획을 작성합니다.
- 하루 런북(`MASTER_RUNBOOK.md`)은 타임라인이 지시한 “오늘의 3대 작업”을 유지합니다.
- 문서/코드 변경은 북극성 표와 연결되지 않으면 수행하지 않습니다.
- 마일스톤 완료 시 본 문서의 “현재 상태”를 업데이트하고 관련 증거를 체크포인트에 남깁니다.

## 참고 링크
- [MASTER_EXECUTION_TIMELINE](../reports/MASTER_EXECUTION_TIMELINE.md)
- [MASTER_RUNBOOK](../catalog/MASTER_RUNBOOK.md)
- [SSOT_SITEMAP](../catalog/SSOT_SITEMAP.md)

> “오늘 무엇을 해야 하는가?” 라는 질문은 항상 이 북극성의 어느 단계를 전진시키는지로 답합니다.
