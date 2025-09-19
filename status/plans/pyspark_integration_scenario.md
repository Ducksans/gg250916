---
timestamp:
  utc: 2025-09-18T11:20Z
  kst: 2025-09-18 20:20
author: Codex (AI Agent)
summary: Stage 2 Agent Studio에서 PySpark 워크플로우를 활용하기 위한 시나리오 초안
document_type: scenario
stage: stage2
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# PySpark Integration Scenario (Stage 2 Draft)

## 목적
- Agent Studio에서 Spark 세션을 호출해 대량 데이터 전처리/분석 작업을 수행하고 결과를 Evidence로 기록.

## 시나리오 개요
1. Planner가 Runbook/TIMELINE에서 "데이터 정리" 작업을 선택.
2. Executor가 PySpark 작업 템플릿을 생성 → MCP `code.diff.apply`로 스크립트 작성.
3. UI에서 PySpark 실행 버튼 → `scripts/cron_legacy_import.py` 스타일의 런타임을 재사용하되 SparkSession을 생성.
4. 실행 결과는 `/status/evidence/pyspark_runs/<timestamp>.json` 저장, CKPT Append.

## 필요 요소
- 환경: `venv` + `tools/java/jdk-17.0.11+9` (README 명령 참조)
- MCP 권한: 파일 읽기/쓰기, Spark 실행 스크립트 동작, Evidence 기록

## TODO
- [x] 환경 가이드 정의 (`status/plans/pyspark_env_setup.md`)
- [x] Spark 실행용 MCP 래퍼 구현 (`scripts/mcp/pyspark_execute.py`)
- [x] UI 버튼/Planner 액션 연결 (TopToolbar → Run PySpark → /api/mcp/pyspark/run)

## 참고
- Stage 2 Kickoff 문서, Stage 2 Outline, README PySpark 명령 모음
