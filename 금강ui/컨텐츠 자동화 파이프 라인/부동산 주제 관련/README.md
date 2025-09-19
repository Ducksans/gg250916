# Real Estate Content Hub — SSOT & Automation

작성시각: 2025-09-18 20:17 KST
작성자: Cascade

## 개요
본 저장소는 공식/권위 데이터 기반의 부동산 콘텐츠 허브(오리진)와 자동화 파이프라인을 위한 문서팩·스펙·룰·목업·리포트를 포함합니다.

## 아키텍처(요약)
```mermaid
flowchart LR
  A[Sources\n(API/RSS/HTML/CSV/PDF)] --> B[Connector Wizard\n(Extract/Normalize)]
  B --> C[Evidence/Checkpoints\nSSOT JSONL]
  B --> D[(Postgres\ncontent/ops/analytics)]
  D --> E[Meilisearch]
  D --> F[/API Layer\nimport/revalidate/search/geo/parcel/overlay/market/isochrone/]
  F --> G[Origin Site\nProgrammatic SEO + JSON-LD/OG/oEmbed]
  G <--> H[PWA/Apps\nTools/Checklists/Booking/Report]
  G --> I[KPI & Dashboard\nGA4/GSC + Dataview]
```

## 빠른 시작
- 핵심 문서
  - `realestate_site_proposal_report.md` — 통합 제안/로드맵
  - `2.올린다.md` · `3.관찰한다.md` · `4.관리한다.md` · `5.더 좋게 만든다.md` · `6.실행 로드맵...md` · `7.참고자료 및 부록.md`
- 스펙/룰
  - `openapi/openapi.yaml` — API 계약
  - `rules/regulation_tldr_kr.yml` — 규제 TL;DR 룰셋(플레이스홀더)
- 목업
  - `docs/mockups/real_estate_hub.html` · `docs/mockups/search_results.html` · `docs/mockups/property_detail.html`
- KPI/리포트
  - `status/reports/KPI_DASHBOARD.md` · `status/reports/DAILY_YYYY-MM-DD.md` · `status/reports/WEEKLY_YYYY-Www.md`

## 데이터 시드(Phase 0)
- 경로: `status/evidence/content/seed/SEED_CONTENT_ITEMS.jsonl`
- 목표: 50–100건 정규화 후 목록/검색 렌더 AC 달성

## 컴플라이언스/신뢰
- 표시·광고 고시(국토부 2020-595) 하드게이트
- 개인정보 마스킹/050, 출처/라이선스 표기, robots/약관 준수

## 품질 게이트(CI)
- 링크체커, 구조화 데이터 테스트, OpenAPI Lint, YAML Lint
- 자세한 내용: `docs/QUALITY_GATES.md`

## 스키마/템플릿
- JSON-LD 템플릿: `templates/jsonld/`
- Sitemap 샘플/스토브: `sitemaps/`

### JSON-LD Breadcrumbs (FastAPI 연동)
```bash
# 예시: 브레드크럼 생성 + Evidence 저장
curl -sG 'http://127.0.0.1:8000/api/v2/content/jsonld/breadcrumbs' \
  --data-urlencode 'region_name=서울특별시' \
  --data-urlencode 'region_slug=seoul' \
  --data-urlencode 'category_name=매물' \
  --data-urlencode 'category_slug=listings' \
  --data-urlencode 'title=역삼동 아파트 매물' \
  --data-urlencode 'canonical=https://hub.example.com/listings/yeoksam-apt-123' \
  --data-urlencode 'save=1' | jq

# Evidence 저장 위치
ls -1t status/evidence/content/jsonld_runs | head -n 3
```

### Sitemap Areas (FastAPI 연동)
```bash
# 예시: 지역/행정구역 페이지용 sitemap 생성 + Evidence 저장
curl -sG 'http://127.0.0.1:8000/api/v2/content/sitemap/areas' \
  --data-urlencode 'areas=seoul/junggu,seoul/jongno' \
  --data-urlencode 'save=1'

# 경로 직접 지정도 가능 (콤마 구분)
curl -sG 'http://127.0.0.1:8000/api/v2/content/sitemap/areas' \
  --data-urlencode 'paths=areas/seoul/junggu/,areas/seoul/jongno/' \
  --data-urlencode 'site_base=https://hub.example.com' \
  --data-urlencode 'lastmod=2025-09-18' \
  --data-urlencode 'changefreq=daily' \
  --data-urlencode 'save=1'

# Evidence 저장 위치
ls -1t status/evidence/content/sitemaps_runs | head -n 3
```

## 품질 검사(로컬 스모크)
```bash
# 구조화 데이터(JSON-LD)와 Sitemap XML 기본 형태 확인
scripts/validators/structured_data_smoke.sh

# BASE_URL 변경 가능(기본: http://127.0.0.1:8000)
BASE_URL=http://127.0.0.1:8000 scripts/validators/structured_data_smoke.sh
```

### 추가 JSON-LD 템플릿
- Article: `/api/v2/content/jsonld/article?headline=...&description=...&author_name=...&date_published=...&save=1`
- LocalBusiness: `/api/v2/content/jsonld/localbusiness?name=...&telephone=...&lat=...&lon=...&save=1`

### Sitemap Index 생성기
- `/api/v2/content/sitemap/index?sitemaps=sitemaps/areas.xml,sitemaps/categories.xml&save=1`

## 문서 색인(SSOT)
- `status/catalog/SSOT_SITEMAP.md`
