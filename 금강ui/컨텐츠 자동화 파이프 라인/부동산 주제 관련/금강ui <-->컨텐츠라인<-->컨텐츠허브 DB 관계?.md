
요약부터: **덕산님 이해 거의 정확합니다.** 핵심은 “물리적으로 같은 DB 서버”가 아니라 **하나의 데이터 계약(스키마) + 일관 API/인덱스**를 **공유**하는 것입니다.  
그렇게 하면 **사이트(오리진) ↔ 금강UI ↔ 콘텐츠 자동화 파이프라인**이 회귀 없이 맞물립니다.

---

## 6하원칙 요약(공유 데이터 계약/인덱스)
- 누가(Who): DB/검색 오너, 백엔드(API), 파이프라인 엔지니어, 운영(승인/리밸리데이트)
- 어디서(Where): Postgres(`content/ops/analytics`), Meilisearch, R2/S3, `/api/import|revalidate|search`
- 무엇을(What): 스키마/인덱스/권한(RBAC) 공유, 변경 이벤트→색인/ISR 트리거, SSOT 증거 유지
- 어떻게(How): 스키마 버전/마이그레이션, 트리거/워커, 권한 분리(스키마 기반), SLA 모니터링
- 왜(Why): 회귀 없는 병렬 개발, 운영 간 결합도 최소화, 성능/신뢰/확장성 확보
- 언제(When): 초기엔 단일 인스턴스+스키마 분리, 성장 시 서비스 분리(마이그레이션 스크립트 동반)

## 권장 구조 (초기 최적안)

### SSOT 구성
- **PostgreSQL(단일 인스턴스)** + **스키마 분리**:  
  - `content`(아이템/카테고리/태그/컬렉션/아티클)  
  - `ops`(import_jobs, evidence(append-only), checkpoints(SSOT))  
  - `analytics`(utm 이벤트/전환)
- **Meilisearch**: 검색 인덱스(고속 질의/가중치/동의어)
- **Object Storage(R2/S3)**: 이미지·MDX·첨부 (DB에는 메타/경로만)
- **API 레이어**: `/api/import`(파이프라인→허브), `/api/revalidate`(ISR), `/api/search`(사이트/금강UI 공용)

> 초기엔 **한 Postgres 인스턴스**에서 스키마로 분리(RBAC 포함) → **확장 시 서비스 분리**(별 DB)로 자연스러운 진화가 가능합니다.

---

## 역할/권한 (RBAC)
- `pipeline_writer`: `content`/`ops` **쓰기**, `analytics` 읽기
- `site_reader`: `content`/`Meili` **읽기 전용**
- `ui_admin`: 전체 읽기 + 승인/리밸리데이트 트리거
- `indexer`: DB 변경 이벤트 → Meili 재색인

---

## 데이터 계약(핵심 엔티티)
- `content.items(id, slug, title, summary, body_mdx_path, thumbnail_url, price_plan, features[], links{canonical,aff,utm}, updated_at, …)`
- `content.categories(id, slug, name)` / `content.tags(id, slug, name)` / `content.item_tags(item_id, tag_id)`
- `content.collections(id, slug, name)` / `content.collection_items(collection_id, item_id)`
- `ops.import_jobs(id, source_url, normalized_json_path, status, created_at, …)`
- `ops.evidence(id, run_id, path, sha, created_at)` *(append-only)*
- `ops.checkpoints(id, run_id, payload_json, created_at)` *(SSOT)*
- `analytics.events(id, utm_source, utm_medium, utm_campaign, page, ts, session_id, …)`

---

## 흐름(텍스트 다이어그램)

금강 파이프라인(만든다) ──▶ **/api/import** ──▶ **Postgres(content, ops)**
                                   │
                                   ├─(DB 트리거/워커)──▶ **Meilisearch 인덱스 업데이트**
                                   │
금강UI(승인/관리) ──▶ **/api/revalidate?path=…** ──▶ Next.js ISR 캐시 무효화
                                   │
오리진 사이트(검색/목록/상세) ◀── **Meilisearch + Postgres 읽기**

배포 채널(요약+백링크) ──UTM──▶ **analytics.events**(KPI) ──▶ 금강UI(관찰/개선)

---

## 병렬 개발에서 “같은 DB를 써야 하나?”에 대한 결론
- **필수는 아님.** 중요한 건 **공유된 데이터 계약**과 **API/인덱스 계약**입니다.  
- **초기**에는 운영 단순화를 위해 **하나의 Postgres 인스턴스 + 스키마 분리**가 최선(속도/비용/회귀 최소화).  
- **성장 단계**에서 트래픽/격리 필요 시 **서비스별 DB**로 분리(스키마 그대로, 마이그레이션 스크립트 동반)하면 됩니다.

---

## 회귀를 없애는 체크리스트
- [ ] **데이터 계약 v1** 확정(필수/옵션/enum, 예시 JSON 포함)  
- [ ] **인덱스 계약**(Meili 필드·가중치·정렬키·동의어) 문서화  
- [ ] **퍼블리시 계약**(Canonical/UTM/요약 규칙/링크체커) 고정  
- [ ] **이벤트/트리거**(DB 변경→Meili, 승인→ISR) 테스트  
- [ ] **증거/체크포인트 표준**(append-only 경로, 실패 리트라이 정책) 준수

---

## 한 줄 가이드
- **네, 같은 “데이터 계약과 API/인덱스”를 공유**하도록 설계하는 게 정답입니다.  
- 초기엔 **한 Postgres + 스키마 분리**가 최적, 커지면 **서비스 분리**로 무회귀 진화가 가능합니다.
