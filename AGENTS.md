---
timestamp:
  utc: 2025-09-16T04:51Z
  kst: 2025-09-16 13:51
author: Codex (AI Agent)
summary: 금강 프로젝트 에이전트 운용 핵심 지침과 문서 허브 정리
document_type: agent_core_protocol
tags:
  -  #agent
  -  #protocol
  -  #hub
BT: none
ST: none
RT: none
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# AGENTS.md — 금강 프로젝트 가이드

## 핵심 문서 허브

- [[AGENTS_expand.md|AGENTS 확장 규약]] · [[AGENTS_log.md|AGENTS 로그 및 게이트]]
- [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md|EXEC_PLAN]] · [[status/catalog/SSOT_SITEMAP.md|SSOT Sitemap]]
- 시스템 스펙: [[status/reports/GG_DB_SPEC_V1.md|DB]] · [[status/reports/GG_ORCH_SPEC_V1.md|Orchestrator]] · [[status/reports/GG_MEMORY_5_LAYER_SPEC.md|Memory-5]] · [[status/reports/GG_SSV_SPEC_V1.md|SSV]]
- 파이프라인/감시: [[status/reports/GG_CONTENT_PIPELINE_V1.md|Content Pipeline]] · [[status/reports/GG_SCHEDULER_SPEC_V1.md|Scheduler]] · [[status/reports/GG_CONTEXT_SENTRY_SPEC_V1.md|Context Sentry]]
- 컨텍스트/시간: [[status/reports/GG_CONTEXT_REGISTRY_SPEC_V1.md|Context Registry]] · [[status/reports/GG_API_CONTEXT_SUMMARY.md|Context API]] · [[status/reports/GG_DYNAMIC_BLOCKS_SPEC.md|Dynamic Blocks]] · [[status/reports/GG_TIME_SPEC_V1.md|GG_TIME_SPEC_V1]]
- UI/운영: [[status/reports/GG_UI_RUN_CARD_SPEC.md|Run Card UI]] · [[status/reports/GG_DAILY_OPS_V1.md|Daily Ops]]

## 운용 루프 요약 (PLAN → PATCH → PROVE)

- 일일 운영 허브는 [`README.md`](README.md)입니다. 하루 시작/마감 루틴과 Control Tower 문서 동선을 반드시 해당 README에서 따라갑니다.

- **PLAN:** 사용자 요청을 이해한 뒤 "변경 전 → 변경 후" 구조로 실행 계획 제시. 필요 시 관련 문서 링크를 포함하여 복명복창한다.
- **PATCH:** 승인된 계획만 실행. 변경 전에는 반드시 영향을 받는 문서를 확인하고, 패치 후에는 적용 파일 경로를 기록한다.
- **PROVE:** 결과 보고 시 증거(파일 경로, 명령, 로그)를 함께 제시하고 Obsidian에서 확인 가능한 위치를 안내한다.

## 출력 및 언어 규칙

- 기본 응답 형식은 간결한 마크다운 요약. "JSON MODE" 지시 시 해당 스키마만 출력.
- 기본 대화 언어는 한국어. 코드, 명령, 경로 등은 영어 원문 유지.
- 처음 등장하는 영어 약어는 원문과 한글 설명을 병기(CI/CD: 지속적 통합/지속적 배포 등).
- 사용자는 프로그래밍 초보를 가정. 테스트·확인 절차는 단계별로 천천히 안내하고 예시를 곁들인다.

## 안전/경계 및 실행 전제

- 프로젝트 루트 밖, `.git/**`, `node_modules/**`, `dist/**`, `build/**`는 수정 금지.
- 환경 변수와 비밀 키는 절대 노출하지 않는다(`.env` 내용은 존재 여부만 언급).
- 모든 실행 명령은 가능하면 `--dry-run` 여부를 확인하고, 위험한 명령어는 대안과 함께 설명한다.

## Git 및 테스트 지침

- 로컬 저장소(`~/바탕화면/gumgang_meeting/`)가 단일 진실 원본(SSOT)이다.
- 원격 동기화 전에는 `git fetch`, `git status`, `git log` 결과를 확인하고 사용자 승인 후 진행한다.
- 테스트/빌드/린트는 VS Code Tasks 예: `web:test`, `lint:fix`와 같이 제안한다.

## Obsidian Vault 운용 원칙

- Vault 루트는 프로젝트 루트. `node_modules`, `dist`, `.git` 등은 Obsidian에서 제외한다.
- 기본 보기: Reading View, Strict Markdown 사용 권장. DYN 블록과 시간 헤더 형식은 `GG_TIME_SPEC_V1`을 따른다.
- 링크 자동 업데이트, 자동 첨부 이동, 미해결 링크 경고는 해제하여 의도치 않은 파일 이동을 막는다.
- Global Graph 필터 예시: `tag:#project and -path:archive`. 필터 쿼리는 `AGENTS_expand.md`와 `AGENTS_log.md`에 기록된 대로 유지한다.

## 문서 메타데이터와 시간 규약

- 모든 신규/수정 문서 및 코드 상단에 타임스탬프(UTC/KST), 작성자, 요약, 태그 등을 기록한다.
- 표준 포맷 예시: `2025-09-16T04:51Z (UTC) / 2025-09-16 13:51 (KST) | Author: Codex (AI Agent) | Summary: ...`
- 시간 규약 세부 내용은 [[status/reports/GG_TIME_SPEC_V1.md|GG_TIME_SPEC_V1]] 참조. 체크포인트 기록 시 `DOCS_TIME_SPEC` 항목에 해당 스펙 버전과 적용 작업을 append한다.

## 기록 및 검증

- 작업 완료 후 결과는 `status/checkpoints/CKPT_72H_RUN.jsonl`에 Append API로 기록한다.
- 메타데이터 검증과 문서 일관성 검사는 [[AGENTS_log.md|문서 관리 게이트]] 지침에 따른다.
- 문서 구조·설계·실행 지침의 상세 분류는 [[AGENTS_expand.md|AGENTS 확장 규약]]에서 확인한다.

## 단일 관문 원칙(FastAPI + DB)

- API 호출·도구·검색은 FastAPI(`/api/*`) 기준으로만 승인합니다.
- Source는 DB(v2) 고정(`/api/v2/threads/*`). 파일(v1)은 이관/백필 채널로만 사용합니다.
- Bridge(Node)는 프리뷰/스냅샷 정적 서빙 전용으로 프리즈합니다(신규 기능 확장 금지).
- 문서·증적·테스트는 FastAPI 계약을 기준으로 작성/검증합니다.

SGM(엄격 게이트) 운영 지침

- 개발: `GG_STRICT_GATE=soft|hard` 토글로 튜닝(환각/무응답률/인용률을 지표로 비교).
- 운영: soft(또는 자동) 기본, 토글 비노출(설정값/환경변수로만 제어).
