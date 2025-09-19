# Market-Defining Standards — UX · SEO · Performance · Accessibility · Compliance

작성시각: 2025-09-18 20:38 KST
작성자: Cascade

## 목적
본 문서는 부동산 컨텐츠 허브가 "시장 표준"이 되기 위한 **절대적 기준**을 정의합니다. 모든 설계/개발/운영 산출물은 본 기준을 통과해야 배포할 수 있습니다.

---

## 1) UX (가독성/사용성/일관성)
- 타이포/라인/폭: 본문 16–18px, line-height ≥ 1.6, 본문 폭 60–80자
- 여백/그리드: 4/8pt 스케일, 그리드 gap ≥ 16px, 주요 컨테이너 `max-width: 1200px`
- 포커스/키보드: `:focus-visible` 링 표시, 탭 순서/랜드마크/ARIA 속성 필수
- 테이블: sticky header, zebra rows, 숫자열 monospace+우정렬, 정렬/필터 UI 제공
- 빈/로딩/에러 상태: 명확한 안내 + 회복 액션(재시도/필터 초기화)

## 2) 접근성 (WCAG 2.1 AA)
- 대비: 텍스트/아이콘 명도 대비 AA 이상(일반 4.5:1, 큰 텍스트 3:1)
- 구조: landmark/heading 계층/aria-label/aria-current 제공
- 폼: label/placeholder 차별화, 에러 메시지/연결, 키보드 전 기능 수행 가능
- 미디어: 대체텍스트/자막(영상)/캡션(이미지) 제공

## 3) 성능 (Core Web Vitals)
- LCP ≤ 2.5s(75%분위), INP ≤ 200ms, CLS ≤ 0.1
- 이미지: lazy-loading/srcset/sizes, WebP/AVIF 우선
- 코드: critical CSS 우선, JS 지연 로드, 폰트 디스플레이 스왑

## 4) SEO/스키마
- JSON-LD: `WebSite/SearchAction`, `RealEstateListing`, `BreadcrumbList`, `ImageObject/VideoObject`
- 메타: OG/Twitter 필수 태그, 정규 URL(Canonical), hreflang(확장 시)
- 사이트맵: index + listings/areas/media 분할, 이미지/비디오 확장 포함
- 내부링크: Pillar→Cluster, 중복/카니발 방지, 빵부스러미(Breadcrumb) 제공

## 5) 컴플라이언스/신뢰
- 표시·광고(국토부 2020-595) 업로드 하드게이트(미충족 차단)
- 개인정보: 마스킹/050(DNI), 동의/목적/보관/파기 고지
- 출처/라이선스: 공식/권위 출처 표기, 갱신시각 명시, 로봇/약관 준수

## 6) 데이터 표준/계약
- 이벤트: `analytics.events`(utm_*, platform, agent_id, deeplink_ref, app_screen)
- 컨텐츠: `content.items`(slug/title/summary/links_json/features_json/updated_at)
- 증거/체크포인트: append-only JSONL, 경로 규약 유지

## 7) 품질 게이트(차단 기준)
- 구조화 데이터 실패율 > 5% → 배포 차단
- 링크 4xx/5xx > 2% → 원인 리포트/수정 후 재시도
- 5분 응답률 < 60%(주간) → SLA 알림/코칭

## 8) 보고/가시화
- KPI 대시보드(Dataview) + DAILY/WEEKLY 리포트 템플릿
- 최근 7일/4주 추세 카드 제공

---

## 적용/검증 체크리스트
- [ ] 레이아웃/타이포/그리드/포커스 링 OK
- [ ] 테이블 UX(Sticky/Zebra/숫자) OK
- [ ] WCAG 2.1 AA 대비/키보드/폼/미디어 OK
- [ ] CWV 목표치 충족(75%분위) + 이미지 최적화
- [ ] JSON-LD/OG/Twitter/사이트맵 OK
- [ ] 컴플라이언스 하드게이트 OK
- [ ] KPI 대시보드/리포트 반영 OK
