# KPI Dashboard — Real Estate Hub

작성시각: 2025-09-18 20:02 KST
작성자: Cascade

## 6하원칙 요약(KPI 대시보드)

- 누가(Who): 데이터 분석가, 운영, PM/마케팅
- 어디서(Where): SSOT(status/\*), GA4/GSC, 허브/앱 이벤트 로그
- 무엇을(What): 게시/노출/CTR/전환/응답속도/링크·구조화 오류 Top-N
- 어떻게(How): Dataview 카드, GA4/GSC 리포트, Evidence/Checkpoints 참조
- 왜(Why): 성과 진단, 결함 조기 발견, 5분 응답률 제고로 전환 극대화
- 언제(When): 실시간 경보 + 일간 카드 + 주간 품질 점검

---

## 오늘의 KPI

```dataview
TABLE WITHOUT ID file.link AS "Report", kpi, file.mtime AS "Updated"
FROM "status/reports"
WHERE contains(file.name, "DAILY") OR contains(file.name, "KPI")
SORT file.mtime DESC
LIMIT 20
```

데이터 레이어 확장: ope

```dataview
TABLE WITHOUT ID file.name AS "Day", kpi.posts AS "Posts", kpi.approvals AS "Approvals", kpi.leads AS "Leads", kpi.resp_5m AS "Resp<5m", file.mtime AS "Updated"
FROM "status/reports"
WHERE contains(file.name, "DAILY_")
SORT file.name DESC
LIMIT 7
```

## 최근 4주 추세 (Weekly)

```dataview
TABLE WITHOUT ID file.name AS "Week", kpi.posts AS "Posts", kpi.approvals AS "Approvals", kpi.leads AS "Leads", kpi.resp_5m AS "Resp<5m", kpi.oembed_cards AS "OG/oEmbed", kpi.sitemap_images AS "Sitemap Img"
FROM "status/reports"
WHERE contains(file.name, "WEEKLY_")
SORT file.name DESC
LIMIT 4
```

## 게시/승인 현황

- 기준 경로: `ops.import_jobs`, `content.items`
- 카드 예시(개념)
  - 게시: +N, 승인 대기: M, 오류: K

## 리드/응답 속도

- 5분 응답률(주간): r5 / R
- DNI/카카오/폼 채널별 전환율 비교

## 채널별 성과(유입→전환)

- 검색/소셜/레퍼럴/광고별 세션·전환

## 상위 콘텐츠 Top-10

- 조회/전환/체류/이탈/링크체커 실패율

## 링크/구조화 오류 Top-N

- 구조화 실패율 > 5% 경보
- 링크체커 4xx/5xx > 2% 경보

---

## 참고

- 이벤트 스키마: `analytics.events`
- 증거/체크포인트: `status/evidence/**`, `status/checkpoints/**`
- UTM 표준: utm_source / utm_medium / utm_campaign / utm_content
