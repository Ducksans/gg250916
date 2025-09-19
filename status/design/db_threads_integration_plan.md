---
timestamp:
  utc: 2025-09-16T18:49Z
  kst: 2025-09-17 03:49
author: Codex (AI Agent)
summary: Thread 저장소 SSOT를 IndexedDB→DB로 이관하기 위한 단계적 통합 계획(ST0103‑DB)
document_type: design_plan
tags:
  - #design
  - #db
  - #threads
BT: BT-06
ST: ST0103-DB
RT: none
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Thread DB Integration Plan (ST0103‑DB)

## 배경
- 현재: 클라이언트 IndexedDB(GumgangChatDB) + 서버 파일(JSONL, `conversations/threads/**`) 병용.
- 목표: 서버 DB(SQLite 로컬, 선택: PostgreSQL)로 SSOT 일원화. 클라는 캐시로만 동작.
- 근거: [[status/reports/2025-09-12_chating_thread_system_compare_report_between_GG&libre.md]] · [[status/reports/GG_DB_SPEC_V1.md]] · `db/schema/sqlite/schema_v1.sql`.

## 범위
- v2 API 설계/도입(`/api/v2/threads/*`): recent/read/append/import
- 백엔드: SQLite(`db/gumgang.db`) 초기화 및 마이그레이션(JSONL→DB)
- 프런트: import 경로를 v2 API로 전환(플래그형), IndexedDB는 캐시/오프라인

## 인터페이스(초안)
- GET `/api/v2/threads/recent?limit=50`
  - {items:[{id,title,title_locked,last_ts,approx_turns,top_tags[]}], count}
- GET `/api/v2/threads/read?id=<threadId>`
  - {id,title,turns:[{role,text,ts,meta}]}
- POST `/api/v2/threads/append`
  - {id, role, text, meta?} → 200 {ok}
- POST `/api/v2/threads/import`
  - {threads:[{id,title?,messages:[...] }]} → {imported, skipped}

## 수용 기준(AC)
- 새로고침/다른 브라우저에서도 동일 목록/내용 표시(서버 DB가 SSOT)
- recent 응답 300ms 이내(로컬)
- read 스트리밍 가능(옵션) — 긴 스레드 분할 조회(from_turn, limit)

## 단계/작업
1) ST0103-DB-INIT — SQLite 초기화 스크립트 및 DDL 적용(증거: `db/gumgang.db`)
2) ST0103-DB-INGEST — JSONL→DB 백필 스크립트(드라이런/적용 모드)
3) ST0103-DB-API — FastAPI v2 엔드포인트 스텁(파일 기반과 병행 운영)
4) ST0103-DB-UI — import/read 경로를 feature flag로 전환(`GG_THREAD_SOURCE=db|files`)

## 리스크
- 대용량 turns 인서트 성능: WAL/트랜잭션 배치로 완화
- 이중 저장소 동기화: ‘DB 우선, 파일 보조’로 정책 명확화

## 실행/검증
- 스크립트: `scripts/db/init_sqlite.py`, `scripts/db/ingest_threads_jsonl.py`
- 증거: `status/evidence/db/*.log`, `status/evidence/db/*.json`
- CKPT: `ST0103_DB_*` 시퀀스 기록

