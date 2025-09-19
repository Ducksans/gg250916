# [[부동산 컨텐츠 허브 홈페이지 설계 초안]]

> 목표: **부동산 정본(공식/공신력 데이터)**을 대량·안정적으로 모으고, **인기 포맷(영상/이미지/자막)** 생산까지 이어지는 **콘텐츠 자동화 파이프라인**을 구축한다.  
> 원칙: ① **합법/로봇 준수/저작권** ② **SSOT(증거·체크포인트 append-only)** ③ **데이터 계약(content/ops/analytics v2)** ④ **오리진(캐노니컬) 퍼스트**.

---

## 6하원칙 요약(공식자료 수집기/커넥터)
- 누가(Who): 수집/정규화 엔지니어, 데이터 분석가, 법무 자문, 운영자(승인)
- 어디서(Where): Connector Wizard(UI), 워커/큐, Evidence/Checkpoints 경로, SSOT 대시보드
- 무엇을(What): 소스 연결(API/RSS/HTML/CSV/PDF), 필드 매핑, 정규화, 증거 저장, 스케줄/리트라이, 승인 게이트
- 어떻게(How): YAML 프리셋/환경변수, 레이트리밋·백오프, 데이터 계약 준수, 로봇/라이선스 표기, 샘플 50건 검증
- 왜(Why): 합법적이고 신뢰 가능한 데이터 인입을 통해 허브 품질과 자동 생성의 토대를 구축
- 언제(When): Phase0에서 MVP까지 지속 확장, 소스/스키마 변경 시 즉시 갱신·승인 후 배포

## 0) 아키텍처 개요

만든다(수집·정규화) → 올린다(오리진 게시/배포) → 관찰한다(KPI) → 관리한다(승인/격리) → 개선한다(AB/리라이트)

텍스트 다이어그램:

    [Source Catalog]
      ├─ Official APIs (거래가/공시/등기/통계/지자체 공공데이터)
      ├─ 기관 문서(RSS/CSV/PDF/공지)
      ├─ 커뮤니티/언론(저작권·인용 규정 준수)
      └─ 트렌드 신호(검색/영상/커뮤니티 지표)
            │
    [Connector Wizard(GG_UI)]
            │  (YAML/JSON 설정 ⇄ 프리셋)
            ▼
    [Fetcher] ─▶ [Parser] ─▶ [Normalizer] ─▶ [Evidence Store(append-only)]
            │                              └─ status/evidence/** + SHA/URL/ts
            ▼
    [Dedup/Enrich] ─▶ [content.* upsert] ─▶ [Meili/FTS index] ─▶ [/api/revalidate]
            │
    [Multimedia Helper] (스크립트/스토리보드/이미지·영상 프롬프트 킷 출력)
            │
    [KPI/SSOT] Dataview 카드(일간·7일), Checkpoints(JSONL), 승인 게이트

---

## 1) 소스 카탈로그(초안)
- **Official(정본)**: 국가/지자체 공개 API, 부동산 통계/거래가격/세금/제도 공지, 공시지가/지번·지적, 법원 공고 등.  
  (각 기관의 **이용약관/로봇·쿼터/저작권**을 준수. API 우선, HTML 크롤링은 공지/보도자료 등 허용 범위만)
- **Institutional Docs**: PDF/CSV/RSS/블로그 공지(예: 정책 변경/세금·계약 가이드).
- **Community/Media**: 인용 허용/저작권 명확한 자료만 요약·링크백(원문 캐노니컬 링크 필수).
- **Trend Signals**: 검색 급상승, 동영상 플랫폼 조회/완주/댓글, Q&A 포럼 질문량 등(집계치만 사용).

---

## 2) Connector Wizard (API 연결 마법사) — UX 흐름
1. **소스 유형 선택**: API / RSS / HTML / CSV / PDF / Custom(스크립트)  
2. **접속 정보**: 베이스 URL, 인증(키/토큰/OAuth), 쿼터·레이트리밋(요청/초, 일일 상한)  
3. **엔드포인트 정의**: 경로/쿼리/페이지네이션/포맷(JSON/XML/HTML)  
4. **매핑**: 소스 필드 → `content.items`/`ops.import_jobs`/메타(증거) 맵핑  
5. **정규화 규칙**: 키/값 클린업, 주소/좌표/가격 단위 통일, 날짜·통화 파싱  
6. **일정/트리거**: 크론/웹훅/수동 실행, 실패 재시도(backoff)  
7. **법적 확인**: robots/약관 체크리스트, 저작권/출처 표기 방식 지정  
8. **미리보기 & 승인**: 50건 샘플 인입→정규화→중복/스키마 검증→승인 후 운영 투입

---

## 3) 커넥터 설정 스키마(YAML; 예시)
(※ 출력은 들여쓰기 코드블록으로 표기함. 그대로 `connectors/{name}.yaml`에 저장)

    id: molit_transactions_kr
    type: api
    base_url: https://api.example.go.kr/realestate/transactions
    auth:
      kind: api_key
      header: X-API-KEY
      value: ${SECRETS.MOLIT_KEY}
    params:
      region: ${ENV.DEFAULT_REGION}
      from: ${RUN.ts_minus_days:7}
      to: ${RUN.ts}
      page: 1
      per_page: 100
    pagination:
      kind: query_inc
      param: page
      until: $.meta.has_next == false
    extract:
      format: json
      list_path: $.data.items[*]
      fields:
        id: $.trade_id
        title: $.addr + " " + $.apt_name
        summary: "전용 " + $.area + "㎡ / " + $.price + "만원 (" + $.trade_date + ")"
        features_json: $.features
        links_json:
          canonical: $.source_url
        updated_at: $.trade_date
    normalize:
      currency: KRW
      area_unit: sqm
      address_clean: true
    map_to:
      table: content.items
      upsert_keys: [id, slug]
      slug: slugify($.addr + "-" + $.apt_name + "-" + $.trade_date)
    schedule:
      cron: "*/30 * * * *"   # 30분 간격
      rate_limit_rps: 2
      retries: { max: 3, backoff: 2.0 }
    evidence:
      save_body: true
      path: status/evidence/content/molit/${RUN.date}/${id}.json
    compliance:
      robots_ok: true
      citation_required: true
      license: "open-data"

---

## 4) 수집 파이프라인 단계(구현 지침)
- **Fetcher**: HTTP(요청서명), RSS, 파일시스템, S3/R2. 429/5xx 시 지수Backoff, 재개 가능한 체크포인트.  
- **Parser**: JSON/XML(빠른 파서), HTML(Playwright/JS 렌더 옵션), CSV/PDF(텍스트 추출+표 파서).  
- **Normalizer**: 주소/좌표, 가격/면적/세금 단위 표준화, 날짜 타임존 통일(UTC 저장, KST 뷰).  
- **Evidence**: 원문 스냅샷 저장(경로 규약: `status/evidence/**`), SHA256, 수집시각, 라이선스/출처. *append-only*.  
- **Dedup**: URL/키 조합 + 텍스트 해시(SimHash/MinHash) + 근접 기간 내 중복 제거.  
- **Enrich**: 행정구역 코드/학교/교통 POI 조인, 세금/비용 자동계산 필드 추가(표준 함수).  
- **Upsert**: `content.items`/`categories/tags/collections`, `ops.import_jobs` 상태 기록.  
- **Index**: Meilisearch/PG-FTS 색인 갱신, `/api/revalidate`로 ISR 무효화.  
- **Guard**: HUMAN_APPROVAL(대규모 퍼블리시/삭제), QUARANTINE(품질·저작권 의심건 격리).

---

## 5) 데이터 계약(스키마 매핑 요약)
- `content.items`: `id, slug, title, summary, body_mdx_path, thumbnail_url, price_plan, features_json[], links_json{canonical,utm,aff,app_route}, updated_at`  
- `ops.import_jobs`: `id, source_url, normalized_json_path, status, error_msg, created_at, updated_at, origin("api|batch|app|web")`  
- `analytics.events`: `platform, agent_id, app_screen, deeplink_ref, push_topic, utm_*` (가산)  
- **관계**: `item_tags`, `collections/collection_items`로 카테고리·테마 묶음.

---

## 6) 트렌드/인기 포맷 “해결사” 모듈
- **트렌드 수집기**: 검색 급상승·영상 플랫폼 카테고리 탑N·Q&A 포럼 질문량 → **키워드/의도 분류**(거래/세금/계약/지역/추천).  
- **포맷 추천기**: 주제별 **최적 포맷** 제안(숏폼 45~60s / 롱폼 6~8분 / 카드뉴스 5~7장 / 블로그 1,500~2,000자).  
- **제목/썸네일 A/B 후보**: 5개씩 생성, 금칙어 필터, CTR 예측 스코어(휴리스틱).  
- **CTA/링크 맵**: 각 포맷→허브 canonical, 앱 유틸(계산기/체크리스트) 딥링크 자동 삽입.

---

## 7) 영상·이미지·자막 **프롬프트 킷**(템플릿)
- **스토리보드(숏폼)**: HOOK(3s)→문제(10s)→근거(15s)→계산/툴(10s)→CTA(5s).  
- **자막(SRT) 규격**: 12–18자/줄, 2줄 이내, 1샷 2–4초, 전문용어는 괄호 설명.  
- **이미지 프롬프트 변수**: `{도시/단지/실내타입}`, `{톤=정돈·밝음}`, `{텍스트 오버레이=키워드 3개}`.  
- **영상 프롬프트 변수**: `{나레이션=요약}`, `{B-roll=지도/단지/교통}`, `{자막핵심=3포인트}`, `{엔딩CTA=앱 딥링크}`.  
- **산출물 파일**  
  - `status/evidence/content_input/<run_id>/brief.md` (브리프)  
  - `…/script.md` (촬영/나레이션 스크립트)  
  - `…/storyboard.json` (씬·타임라인)  
  - `…/image_prompts.jsonl` / `…/video_prompts.jsonl` (모델 입력용)

---

## 8) 합법/신뢰 가드레일
- **robots.txt/약관 준수**, 헤더 `User-Agent: GumgangCrawler`, 연락처·목적 명기.  
- 수집 데이터의 **라이선스/출처** 저장, 표시 요구 시 페이지 하단 자동 렌더.  
- **개인정보/민감정보** 자동 마스킹, 저작권 의심·비허용 소스는 사전 화이트리스트 필요.  
- 정책 변경/정정 공지 **우선 반영**(우선순위 큐), 법적 분쟁 대비 **증거 스냅샷** 유지.

---

## 9) 인프라 & 스택(권장)
- **런타임**: Python(Playwright/Requests/Polars), Node(Playwright/cheerio) 혼용 가능  
- **큐/스케줄러**: Celery/RQ + Cron, 또는 Temporal/Quartz  
- **저장소**: Postgres(+pgvector/tsvector), SQLite 로컬 테스트, R2/S3(증거/미디어)  
- **검색**: Meilisearch(운영), PG-FTS(백업)  
- **옵스**: OpenTelemetry 로깅, Prometheus(수집/에러율/지연), Sentry(파서 오류)  
- **보안**: Vault/Secret Manager(API 키), IP 화이트리스트, 요청 속도 제한

---

## 10) 마일스톤(30/60/90일)
- **D0–D7 (Phase0)**  
  - Connector Wizard MVP(프리셋 3종: API/RSS/HTML)  
  - Postgres/Meili 연결, Evidence/Checkpoint 경로 확정  
  - 50건 샘플 수집→정규화→허브 목록 렌더
- **D8–D30 (MVP)**  
  - 공식 API 3~5개 연결, CSV/PDF 파서 1종, 트렌드 수집기 v0  
  - 스토리보드/자막/썸네일 프롬프트 킷 v1  
  - KPI 카드(일/7일), 실패 리트라이/격리 운영
- **D31–D60 (V1)**  
  - 커넥터 10+개, 중복제거/유사합치, 주소·좌표 정규화  
  - 영상·이미지 파이프와 앱 딥링크 연동(계산기/체크리스트)  
  - 승인 게이트/권한, 링크체커(Canonical/UTM)
- **D61–D90 (V2)**  
  - 추천/개인화 신호 접목, 지역 리포트 자동 생성  
  - 멀티계정 운영(파트너·중개사), 리포트 상용화/제휴

---

## 11) 바로 실행 체크리스트(오늘)
- [ ] `connectors/` 디렉터리와 YAML 스키마 채택(샘플 1개 운용)  
- [ ] Evidence/Checkpoint **append-only** 경로 생성 및 로거 연결  
- [ ] `/api/import`(upsert)·`/api/revalidate`(ISR) 스텁 연결  
- [ ] 트렌드 수집기 v0(키워드 TOP-20) + 포맷 추천기 v0 실행  
- [ ] 프롬프트 킷 템플릿(스크립트/스토리보드/SRT/이미지·영상 프롬프트) 저장

---

## 12) 한 줄 결론
**공식 소스 API 중심의 “연결 마법사 + 증거 기반 수집 파이프라인”**을 먼저 세우고, **트렌드·프롬프트 킷**을 얹어 **오리진 퍼스트**로 배포하면—허브 콘텐츠가 풍부해지고, 앱/배포채널과 유기적으로 순환하는 **지속 성장 엔진**이 완성됩니다.
