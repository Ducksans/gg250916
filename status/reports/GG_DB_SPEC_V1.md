---
phase: present
---

# GG DB Spec v1 — 금강 UI/오케스트레이션/5계층 메모리용 데이터베이스 설계

- 목적: 채팅(기억 5계층)과 오케스트레이션 실행, 콘텐츠 파이프라인 산출물 관리/검색/필터링을 하나의 로컬 스택으로 통합.
- 원칙: 외부 서비스 미의존, 단일 파일 DB 우선, 증거/재현성 중시.

## 기술 스택(초안)
- Tier A — Enterprise 중앙 스토어(선정): PostgreSQL 16 + pgvector 0.7 + tsvector(FTS) + GIN/RUM 인덱스
  - 이유: 성숙한 트랜잭션/동시성, 강력한 인덱싱/검색, 확장성(샤딩/리플리카), 운영/백업 체계 용이
  - 벡터: pgvector(HNSW/IVFFlat), 텍스트: tsvector + GIN/RUM, 파티셔닝으로 장기 보존 최적화
  - 아티팩트: 파일시스템 또는 오브젝트 스토리지(S3 호환)와 경로/메타만 DB에 저장
- Tier B — 로컬 단일파일 캐시: SQLite 3.45+ (WAL)
  - Full‑Text: FTS5
  - Vector: sqlite-vec(가능 시) / 없으면 브루트포스 + 캐시
- Front cache: IndexedDB(세션/캐시), LocalStorage(환경/토글)

## 테이블 스키마(초안)
- threads(id TEXT PRIMARY KEY, title TEXT, tags TEXT, created_at INTEGER, updated_at INTEGER)
- messages(id TEXT PRIMARY KEY, thread_id TEXT, role TEXT, content TEXT, meta_json TEXT, created_at INTEGER)
- flows(id TEXT PRIMARY KEY, name TEXT, version INTEGER, meta_json TEXT, created_at INTEGER, updated_at INTEGER)
- nodes(id TEXT PRIMARY KEY, flow_id TEXT, type TEXT, config_json TEXT, x REAL, y REAL)
- edges(id TEXT PRIMARY KEY, flow_id TEXT, src TEXT, dst TEXT, meta_json TEXT)
- runs(id TEXT PRIMARY KEY, flow_id TEXT, status TEXT, started_at INTEGER, finished_at INTEGER, meta_json TEXT)
- steps(id TEXT PRIMARY KEY, run_id TEXT, node_id TEXT, status TEXT, log_json TEXT, started_at INTEGER, finished_at INTEGER)
- artifacts(id TEXT PRIMARY KEY, run_id TEXT, path TEXT, kind TEXT, meta_json TEXT, created_at INTEGER)
- mem_items(id TEXT PRIMARY KEY, tier INTEGER, key TEXT, value_json TEXT, score REAL, decay_at INTEGER, created_at INTEGER, updated_at INTEGER)
- embeddings(id TEXT PRIMARY KEY, item_type TEXT, item_id TEXT, model TEXT, dim INTEGER, vec BLOB, created_at INTEGER)

FTS5(예)
- threads_fts(content=threads, title)
- messages_fts(content=messages, content)
- artifacts_fts(content=artifacts, path, kind, meta_json)

Vector(예)
- sqlite-vec: `CREATE VIRTUAL TABLE vec_messages USING vec(item_id, vec, dim=768);`
- 삽입 시 embeddings와 동기화 → 질의는 `KNN` → item_id로 원문 조인

## 인덱스 & 성능
- 최신순: (updated_at DESC) 인덱스
- 조인 키: thread_id, flow_id, run_id, node_id
- 캐시: 최근 N 결과 in-memory, 빈번 질의 precompute

PostgreSQL 전용(예)
- tsvector 컬럼(예: messages_fts) + GIN/RUM 인덱스
- pgvector 인덱스(HNSW/IVFFlat) + recall@precision 요구사항에 맞춘 파라미터 튜닝
- 파티셔닝(월별 runs/steps/artifacts)로 장기 데이터 관리

## 마이그레이션
- 입력: `migrated_chat_store.json`
- 규칙: 모델명 정규화, 누락 필드 기본값, thread/message 분리, created_at 보존
 - 대용량 HTML/청크 파일: 청킹/정규화 후 원문은 아티팩트로 저장, 요약/키워드/임베딩만 DB

## 보안/가드
- 프로젝트 경계 밖 경로 금지, 제외 패턴(.git/**, node_modules/** 등)
- 최대 크기/타임아웃/메모리 제한

## 결정(선정) 및 대안
- 선정: PostgreSQL 16 + pgvector 0.7 + tsvector(FTS) + GIN/RUM
  - 프로덕션/분산 환경(20대 에이전트)에서도 중앙화 운영/백업/모니터링 용이
- 로컬/오프라인 대안: SQLite + FTS5 + sqlite-vec(옵션)
- 연구/대규모 대안(옵션): Milvus/Qdrant/Weaviate 등 독립형 벡터DB(차후 검토)
