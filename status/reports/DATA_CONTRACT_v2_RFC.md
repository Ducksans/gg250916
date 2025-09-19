---
timestamp:
  utc: 2025-09-17T13:05Z
  kst: 2025-09-17 22:05
author: Codex (AI Agent)
summary: DATA_CONTRACT_v2 — content/ops/analytics/search 스키마와 FastAPI 계약(RFC 초안)
document_type: rfc
tags: [rfc, db, api, contract]
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
links:
  - [[status/tasks/ST-0701_data_contract_v2_rfc.md]]
  - [[status/reports/MASTER_EXECUTION_TIMELINE.md]]
---

# DATA_CONTRACT_v2 (RFC)

목적
- 금강UI ↔ 콘텐츠 자동화 파이프라인 ↔ 콘텐츠 허브를 단일 데이터/API 계약으로 맞물리게 한다.
- 운영(PostgreSQL), 로컬/테스트(SQLite) 동등 지원. 변경은 가산적(additive-only). 증거·체크포인트는 append-only.

원칙
- 단일 관문(FastAPI) — UI/파이프라인/허브 모두 FastAPI 계약만 호출
- 가산적 변경 — 필드 제거/의미 변경 금지, 새 필드는 선택적+기본값
- 타입 통일 — API 응답의 시간은 ISO8601(Z), ID는 ULID/UUID 문자열
- 보안/게이트 — 퍼블리시/삭제/대규모 배포는 HUMAN_APPROVAL 토큰 필요

## 1. 스키마 모듈(논리)
- content: 공개 콘텐츠(아이템/태그/컬렉션)
- ops: 파이프라인 운용(인게스트 잡, evidence, checkpoints; append-only)
- analytics: UTM/전환 이벤트(선택)
- search: 검색/보기용 뷰(허브/금강UI 공용)

### 1.1 content (필수)
필드(공통 의미)
- items: { id(ULID), slug, title, summary?, body_mdx_path?, thumbnail_url?, price_plan?, features_json[], links_json{}, updated_at }
- tags/categories/collections + 조인 테이블(다:다)
메모: PostgreSQL은 JSONB, SQLite는 TEXT(JSON 문자열) 사용. 서버에서 Pydantic으로 정규화.

### 1.2 ops (필수)
- import_jobs: { id, source_url?, normalized_json_path?, status, error_msg?, created_at, updated_at }
- evidence: { id, run_id, path, sha?, created_at }
- checkpoints: { id, run_id, payload_json, created_at }
규칙: evidence/checkpoints는 append-only, run_id로 CKPT JSONL과 상호 참조.

### 1.3 analytics (선택)
- events: { id, ts, page?, session_id?, utm_source?, utm_medium?, utm_campaign?, ref?, conv_type?, meta_json }

### 1.4 search (필수)
- content_search_view: items 중심 통합 뷰. 초기엔 DB 뷰, 성장 시 Meilisearch 어댑터 사용.

## 2. 스키마 구현(물리)
- Postgres: `db/schema/postgres/{content_v2.sql,ops_v2.sql,analytics_v2.sql,search_v2.sql}`
- SQLite:  `db/schema/sqlite/{content_v2.sql,ops_v2.sql,analytics_v2.sql,search_v2.sql}`
- 마이그레이션: `db/migrations/{postgres|sqlite}/00{2..5}_*.sql` — v1(core) 불변, v2 가산적 적용

### 2.1 타입/시간 규약
- API 레이어: PG/SQLite 차이를 흡수하여 ISO8601(Z)로 반환, 입력 시 epoch/ISO 모두 수용
- ID: ULID 권장(시간정렬/충돌방지). DB에는 TEXT 저장

## 3. FastAPI 계약(최소)
### 3.1 POST /api/v2/content/import
요청(body)
```json
{
  "run_id": "run_2025_09_17T10_00Z",
  "upsert": true,
  "items": [
    {
      "id": "itm_toolify",
      "slug": "toolify",
      "title": "Toolify",
      "summary": "AI 도구 허브의 대표격",
      "body_mdx_path": "content/toolify.mdx",
      "thumbnail_url": "https://…",
      "price_plan": "freemium",
      "features_json": ["catalog","tagging","search"],
      "links_json": {"canonical":"https://www.toolify.ai/ko/","utm":{"source":"hub","medium":"catalog","campaign":"launch"}},
      "tags": ["ai-tools","catalog"]
    }
  ],
  "collections": [{"id":"col_benchmark","slug":"benchmark-hubs","name":"Benchmark Hubs","items":["itm_toolify"]}]
}
```
응답(예)
```json
{"ok": true, "upserted": {"items": 1, "tags": 2, "collections": 1}, "meta": {"ts": "2025-09-17T10:00:00Z"}}
```
동작
- payload 검증 → 트랜잭션 upsert(content/*) → ops.import_jobs 상태 갱신 → ops.evidence/ops.checkpoints append → (옵션) 색인 트리거

### 3.2 GET /api/v2/content/search
쿼리: `q, page=1, size=20, filters=tag:xxx,price:free`
응답(예)
```json
{"ok": true, "data": {"items": [{"id":"itm_toolify","slug":"toolify","title":"Toolify","summary":"…","thumbnail_url":null,"updated_at":"2025-09-17T10:00:00Z","tags":["ai-tools"],"links_json":{}}], "total": 1}}
```
실행: DB view(content_search_view) 우선, Meilisearch는 어댑터로 대체 가능

### 3.3 POST /api/v2/content/revalidate
요청: `{ "paths": ["/tools/toolify"], "reason": "import" }`
응답: `{ "ok": true, "revalidated": ["/tools/toolify"] }`
역할: 허브 캐시/ISR 재검증 큐

## 4. 보안/권한/게이트
- /api/v2/content/import: 인증 토큰(내부/서버-서버), 승인 플래그 필요
- 위험 액션(HUMAN_APPROVAL) — 퍼블리시/삭제/대규모 리인덱스는 별도 게이트 토큰
- 로그: 모든 쓰기엔 ops.evidence/ops.checkpoints 경로를 강제

## 5. 마이그레이션 전략
1) 로컬(SQLite) 적용 → /api/import → /api/search E2E PASS (ST‑0703)
2) 운영(PG) 마이그레이션 — 듀얼 어댑터 검증 후 전개
3) 색인(Meili) — 필요 시 점등(ensureIndices, indexItems)
롤백: v2 전용 테이블/뷰만 제거 가능(v1 불변)

## 6. DoD(수용 기준)
- RFC 승인(본 문서) 및 링크 등재(RUNBOOK)
- FastAPI 스텁 3종 200 OK(JSON 예시와 일치)
- SQLite E2E PASS + 증적/CKPT append

## 7. Open Points
- 태그/카테고리 생성 정책(임의 생성 vs 사전 정의)
- 가격 플랜 enum 고정 여부
- Meili 인덱스 스키마/동기 주기(초기 OFF 권장)

