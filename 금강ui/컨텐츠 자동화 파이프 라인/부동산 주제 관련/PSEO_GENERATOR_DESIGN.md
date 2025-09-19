# PSEO 페이지 생성기 설계

## 1. 개요
부동산 허브의 PSEO(프로퍼티 SEO) 페이지를 자동 생성하는 시스템 설계 문서입니다. `SEED_CONTENT_ITEMS.jsonl`을 입력으로 받아 최적화된 정적 페이지를 생성합니다.

## 2. 입력 데이터 구조
```json
{
  "id": "AA-2025-0001",
  "type": "apartment",
  "title": "서울 강남구 역삼동 아크로리버뷰",
  "address": "서울특별시 강남구 테헤란로 415",
  "coords": {
    "lat": 37.498085,
    "lon": 127.027620
  },
  "specs": {
    "price": "25억 8,000",
    "area_m2": 84.97,
    "floor": "15/25",
    "rooms": 3,
    "bathrooms": 2,
    "built_year": 2018,
    "direction": "남향"
  },
  "tags": ["역세권", "주차가능", "풀옵션", "남향"],
  "features": ["에어컨", "세탁기", "냉장고", "인덕션"],
  "images": [
    {
      "url": "https://example.com/img1.jpg",
      "alt": "아크로리버뷰 전경"
    }
  ],
  "nearby": {
    "subway": [
      {"name": "강남역", "line": "2호선", "distance_m": 350},
      {"name": "강남역", "line": "신분당선", "distance_m": 350}
    ],
    "schools": [
      {"name": "역삼초등학교", "type": "초등학교", "distance_m": 450}
    ]
  },
  "created_at": "2025-09-15T10:00:00Z",
  "updated_at": "2025-09-15T10:00:00Z"
}
```

## 3. 페이지 생성 전략

### 3.1 URL 구조
```
/property/{시군구}/{동}/{건물명}/{id}
→ /property/seoul-gangnam/yoksam/acro-riverview/AA-2025-0001
```

### 3.2 메타 태그 자동화
```html
<!-- 기본 메타 -->
<title>[매매] {건물명} {전용면적}㎡ {가격} | {지역} 부동산</title>
<meta name="description" content="{지역} {건물명} {전세/매매} 정보. {주요_특징_3개}. 실거래가, 주변시설, 대중교통 정보 제공.">

<!-- 오픈그래프 -->
<meta property="og:title" content="{건물명} {전용면적}㎡">
<meta property="og:description" content="{지역} {건물타입} {가격} {주요_특징}">
<meta property="og:image" content="{대표_이미지_URL}">

<!-- 스키마 마크업 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Residence",
  "name": "{건물명}",
  "description": "{지역} {건물타입} {주요_특징}",
  "floorSize": "{전용면적}㎡",
  "numberOfRooms": {방_개수},
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "{시군구}",
    "addressRegion": "{시도}",
    "streetAddress": "{도로명주소}"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": {위도},
    "longitude": {경도}
  },
  "image": ["{이미지_URL_1}", "{이미지_URL_2}"]
}
</script>
```

## 4. 페이지 구성 요소

### 4.1 헤드라인
```
[매매/전세] {건물명} {전용면적}㎡ | {가격}
{주소} | {해당_동} {매물_유형} {현재_공급_중인_세대_수}세대
```

### 4.2 갤러리
- 메인 이미지 (최대 20장)
- 360° VR 투어 링크 (있을 경우)
- 평면도 이미지

### 4.3 주요 정보 요약
```
▣ 기본 정보
- 거래 유형: {매매/전세/월세}
- 전용면적: {XX}㎡/{평형}평형
- 해당층/전체층: {X}층/{총_X}층
- 방향: {남향} | 입주가능일: {즉시입주}
- 주차: {가능/불가능} {주차_가능_대수}대

▣ 시세 정보 (평균)
- 평균 매매가: X억 X,XXX만원 (XX만원/3.3㎡)
- 평균 전세가: X억 X,XXX만원
- 월세 보증금/월세: X,XXX만원/XX만원
```

### 4.4 상세 정보
- 건물 개요
- 시설 정보
- 관리비 내역
- 주변 시설 (API 연동)
  - 대중교통 (지하철/버스)
  - 교육 시설 (학교/학원)
  - 생활 편의 (마트/병원/은행)
  - 음식점/카페

## 5. 정적 생성 프로세스

1. **데이터 수집 단계**
   - `SEED_CONTENT_ITEMS.jsonl`에서 매물 데이터 로드
   - OpenAPI를 통한 부가 정보 수집 (학군, 교통, 상권)
   - 이미지 최적화 및 CDN 업로드

2. **페이지 생성 단계**
   ```python
   def generate_property_page(property_data):
       # 1. 템플릿 로드
       template = load_template('property.html')
       
       # 2. 데이터 보강
       enriched_data = enrich_with_apis(property_data)
       
       # 3. 컨텐츠 생성
       content = render_template(template, **enriched_data)
       
       # 4. 정적 파일 생성
       output_path = generate_output_path(property_data)
       write_static_file(output_path, content)
       
       # 5. 사이트맵/인덱스 업데이트
       update_sitemap(property_data, output_path)
   ```

3. **검증 단계**
   - HTML 유효성 검사
   - 스키마 마크업 검증
   - 링크 체크
   - 성능 점검 (Lighthouse)

## 6. 출력 예시
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>[매매] 아크로리버뷰 84.97㎡ 25억 8,000 | 서울 강남구 역삼동 부동산</title>
    <meta name="description" content="서울 강남구 역삼동 아크로리버뷰 매매 정보. 역세권, 남향, 풀옵션. 실거래가, 주변시설, 대중교통 정보 제공.">
    
    <!-- OpenGraph / Twitter Cards -->
    <meta property="og:title" content="아크로리버뷰 84.97㎡ | 강남역 도보 5분">
    <meta property="og:description" content="서울 강남구 역삼동 아파트 매매 25억 8,000. 15/25층, 남향, 전용 84.97㎡.">
    <meta property="og:image" content="https://cdn.example.com/properties/AA-2025-0001/cover.jpg">
    
    <!-- Schema.org -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Residence",
      "name": "아크로리버뷰",
      "description": "강남역 도보 5분 거리의 역세권 단지",
      "floorSize": "84.97",
      "numberOfRooms": 3,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "강남구",
        "addressRegion": "서울특별시",
        "streetAddress": "테헤란로 415"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 37.498085,
        "longitude": 127.027620
      },
      "image": [
        "https://cdn.example.com/properties/AA-2025-0001/1.jpg",
        "https://cdn.example.com/properties/AA-2025-0001/2.jpg"
      ]
    }
    </script>
</head>
<body>
    <!-- 페이지 콘텐츠 -->
</body>
</html>
```

## 7. 배포 전략
1. **증분 빌드**
   - 변경된 페이지만 재생성
   - CDN 무효화

2. **A/B 테스트**
   - 다른 메타 설명/제목 테스트
   - 레이아웃 변형 테스트

3. **모니터링**
   - 검색 노출 추적
   - CTR 모니터링
   - 페이지뷰/이탈률 분석

## 8. 유지보수
- 주기적인 데이터 갱신
- 검색 트렌드 반영
- 성능 최적화 지속

## 9. 참고 자료
- [Google의 구조화 데이터 가이드라인](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data)
- [네이버 검색 등록 가이드](https://searchadvisor.naver.com/)
- [다음 검색 등록 가이드](https://register.search.daum.net/index.daum)
