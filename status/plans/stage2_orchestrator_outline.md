---
timestamp:
  utc: 2025-09-18T05:40Z
  kst: 2025-09-18 14:40
author: Codex (AI Agent)
summary: Stage 2(오케스트레이션 허브) 준비를 위한 요구사항/아이디어 초안
document_type: plan
stage: stage2
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Stage 2 Orchestrator Outline (Draft)

## 목표
- Planner/Executor 패널이 금강 UI에서 워크플로우를 조율하도록 설계한다.

## 핵심 요구사항 초안
- [x] 에이전트 세팅/하위 에이전트 생성 UX 아이디어 기록
- [x] MCP 툴 연결(파일/웹/코드 편집기) 매핑 표 작성
- [x] 타임라인/런북과의 연동 포인트 정의

## 상세 아이디어
1. **Agent Management (Agent Studio)**
   - 프로필 템플릿: `role`, `skill`, `memory_scope`, `tool_permissions`
   - 하위 에이전트 생성 플로우: Stage → Agent Studio → Draft → Approve → Deploy
   - 감시(Guardrail) 설정: output review, evidence enforcement, MCP rate limit
2. **MCP Tool Integration**
   - | Tool | 목적 | API/MCP 명령 | 상태 |
     | --- | --- | --- | --- |
     | file.read / file.write | 프로젝트 파일 접근 | `fs.read`, `fs.write` | 기존 구현 |
     | search.web | 외부 정보 수집 | `web.search` | Stage 2 확장 |
     | editor.applyDiff | 코드 편집 | `code.diff.apply` | 설계 필요 |
     | git.status / git.commit | 형상 관리 | `git.status`, `git.commit` | Stage 2 |
   - MCP 허브를 통해 TopToolbar → Tools 패널 → Agent Studio에서 권한 부여
3. **Control Tower 연동**
   - Timeline 항목을 Planner에 자동 큐잉 → Executor가 실행하고 결과를 CKPT에 push
   - Runbook “오늘의 3대 작업”은 Planner에서 바로 가져와 진행 상황 동기화
   - Evidence 경로를 자동 첨부하여 fallback/SGM 로그에 반영

## 로드맵 제안
1. Stage 1 종료 → Stage 2 Kickoff 워크숍(`status/reports/STAGE2_KICKOFF.md` 예정)
2. MCP 권한 매핑 구현 → Agent Studio UI 시안 → Planner/Executor 프로토타입
3. QA & Guardrail 확정 → Stage 2 정식 배포 → Stage 3 준비

## 다음 단계
- Stage 2 워크숍 문서 초안 작성
- Control Tower와 Agent Studio 간 데이터 모델 정의
- 관련 스펙: `status/reports/GG_ORCH_SPEC_V1.md`, `GG_MEMORY_5_LAYER_SPEC.md`
