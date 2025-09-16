---
phase: present
---

# GG Orchestrator Spec v1 — 로컬 오케스트레이션 엔진

## 목표
- 외부 서비스 미의존. 금강 리포 내부에서 플로우(노드/엣지)를 실행하고, 로그/아티팩트를 보관.
- 채팅·파일·웹·변환 노드를 조합해 콘텐츠 파이프라인 및 도구 체인을 구동.

## 구성요소
- Models: Flow/Node/Edge/Run/Step/Artifact (pydantic)
- Engine: in-proc 워커(큐=SQLite/파일), 타임아웃/재시도/중단 지원
- Logger: JSONL + SQLite(steps.log_json), 파일 아티팩트 저장소

## 노드 타입 v0
- LLM: prompt+vars → response(+citations) 반환
- HTTP: GET/POST, 헤더/바디/타임아웃
- FS: read/write/move/delete, 경계/제외 패턴 준수
- Transform: JS/Python 실행(샌드박스/리소스 제한)
- Control: If/Switch/Loop(최소)

## API(초안)
- POST `/api/flows/run` {flow_id|flow_json, input, vars} → {run_id}
- GET  `/api/runs/{id}` → {status, steps, artifacts}
- POST `/api/flows/validate` → {ok, issues[]}

## 보안/가드
- 프로젝트 루트 밖 접근 금지, .git/node_modules/dist/build/__pycache__ 제외
- 파일 크기/네트워크 타임아웃/프로세스 제한

## 산출물/증거
- `status/evidence/pipelines/<run_id>/logs.jsonl`
- `status/evidence/pipelines/<run_id>/artifacts/*`

## CI 연동(후속)
- orch-sim: 샘플 플로우 실행 → 결과 검증/업로드

