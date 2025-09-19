---
timestamp:
  utc: 2025-09-18T10:15Z
  kst: 2025-09-18 19:15
author: Codex (AI Agent)
summary: Stage 2 오케스트레이션 허브 킥오프 아젠다 및 준비 체크리스트
document_type: kickoff_agenda
stage: stage2
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# STAGE 2 Kickoff — Orchestration Hub

## 1. 목적
- Stage 1(코딩 에이전트 UI)에서 확보한 근거/툴을 기반으로 Planner·Executor·MCP 통합 허브 구축.

## 2. 현황 요약 (2025-09-18)
- Stage 1 Sprint Goal 달성: PG ingest, evidence fallback, Toolbar lock, legacy import 완료.
- Stage 2 Outline 확장: Agent Studio 흐름, MCP 권한 매핑, Control Tower 연동 로드맵 정리 (`status/plans/stage2_orchestrator_outline.md`).

## 3. 킥오프 아젠다
1. Stage 1 완료 보고 (Evidence/CKPT 리뷰)
2. Stage 2 목표 및 성공 지표 확정
3. Agent Studio / MCP 매핑 상세 요구사항 검토
4. Control Tower ↔ Planner 데이터 모델 정의
5. 위험요소 및 대응 계획
6. 일정/담당자 확정

## 4. 준비 체크리스트 (사전 자료)
- [ ] Stage 1 증거 패키지 (`status/evidence/ui/**`, `CKPT_72H_RUN.jsonl`)
- [ ] Stage 2 Outline 최신본 (Agent Studio, MCP Table)
- [ ] README/Timeline/Runbook 스냅샷
- [ ] MCP 툴 권한 매트릭스 초안
- [ ] PySpark 환경 안내(`status/plans/pyspark_env_setup.md`, README 명령 모음)

## 5. 타임라인 제안
- Kickoff 회의: Stage 1 wrap-up 후 24시간 내
- Prototype Sprint: 2주 (Planner UI + MCP Hook)
- QA Sprint: 1주 (Guardrail + Evidence 검증)

## 6. 다음 액션
- 참석자/자료 공유 리스트 작성 → Runbook Tomorrow Queue 반영 (`status/plans/stage2_kickoff_package.md`)
- Kickoff 일정 확정 → CKPT 기록
- Stage 2 Sprint Backlog 초안(`status/tasks/BT-07_backlog.md`) 작성

## 7. 회의 일정 (확정)
- 일시: 2025-09-19 11:00 KST (2025-09-19T02:00Z)
- 참석: duksan(Owner), Codex Agent, Stage 2 Task Force
- 준비 자료: Stage 1 Wrap CKPT, Stage 2 Outline, PySpark 환경 안내, MCP 권한 매핑 테이블
