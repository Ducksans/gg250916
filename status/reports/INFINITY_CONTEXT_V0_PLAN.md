---
timestamp:
  utc: 2025-09-17T11:52Z
  kst: 2025-09-17 20:52
author: Codex (AI Agent)
summary: Infinity Context v0 — migrated_chat_store.json 인게스트 설계 초안과 실행 계획
document_type: design_plan
tags:
  - #design
  - #memory
  - #infinity-context
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
links:
  - [[status/catalog/MASTER_RUNBOOK.md]]
  - [[status/reports/TBD_sendPipeline_audit.md]]
---

# Infinity Context v0 — Ingest 설계 초안

목표: 과거 대화(`migrated_chat_store.json`)를 DB(v2) 기반 Thread/Turn 스키마로 인게스트하여, FastAPI 단일 관문에서 멀티턴 연속성과 근거 강화를 지원한다.

## 입력/출력
- 입력 파일: `migrated_chat_store.json` (repo root)
- 출력(표준 API):
  - Threads 목록: `GET /api/v2/threads/recent`
  - Thread 읽기: `GET /api/v2/threads/read?id=<threadId>`
  - Thread 생성: `POST /api/v2/threads/create`
  - Turn 추가: `POST /api/v2/threads/append`

## 스키마 매핑(초안)
- source.conversation_id → thread.id (존재 시 upsert; 없으면 새로 생성)
- source.turns[*] → append(turn): {role, text, ts, meta}
- meta.path/evidence → turn.meta.evidence (path#Lx-y 유지)
- tags → thread.tags

## 처리 규칙
- idempotent: 동일 conversation_id는 재실행 시 중복 삽입 금지(upsert)
- batch size: 100 turns 단위 처리; 실패 시 중단점 체크포인트 기록
- rate limit: p95 응답 시간 1.5s 내 유지; 429/500 시 지수 백오프(최대 3회)

## 실행 계획(초안)
1) 사전 점검
- [ ] `./check_servers.sh`로 8000/3037/5173/5175 헬스 OK 확인(캡처)
- [ ] `GET /api/health` 200

2) 드라이런(—dry-run)
- [ ] `scripts/ingest/infinity_context_v0.py --dry-run` → 파싱/매핑 로그만 출력, DB 쓰기 없음

3) 실제 실행
- [ ] `scripts/ingest/infinity_context_v0.py` → 100턴 단위 커밋, 실패 시 재시도 및 중단점 재개

4) 검증
- [ ] `/api/v2/threads/recent`에서 샘플 20건 확인
- [ ] 특정 threadId 읽기 후 turns 수량/메타 확인
- [ ] CKPT Append(`INFINITY_CONTEXT_V0_INGEST_<UTC>`) + 증거(`status/evidence/ui/ingest/INFINITY_V0_<UTC>.json`)

## 산출물
- 스크립트: `scripts/ingest/infinity_context_v0.py` (차기 단계에서 구현)
- 로그/증거: `status/evidence/ui/ingest/INFINITY_V0_<UTC>.{json,log}`

## 참고
- FastAPI + DB 단일 관문 원칙 준수. Bridge는 사용하지 않음.
- 본 설계는 실행 트리거(soft/SGM 검증) 이후 착수한다.

