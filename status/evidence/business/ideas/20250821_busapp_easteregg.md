---
phase: past
---

# Business Idea Card — Bus Arrival App (Onboarding + Easter Egg Ads)
Date: 2025-08-21
Author: 덕산
Status: IDEA (Evidence Only, Append‑Only)

Note — Evidence/Append‑Only:
- This file is SSOT for “Business 아이디어 1호”.
- Do not edit in place. New thoughts must be appended chronologically with a timestamp.
- UI/impl artifacts should reference this Evidence path.

Path (SSOT): gumgang_meeting/status/evidence/business/ideas/20250821_busapp_easteregg.md

---

## 1) 개요
버스 도착 알림 앱의 핵심 전략:
- “온보딩 3단계”로 즉시 개인화(출발/도착/시간).
- “심플 뷰” 한 화면, 한 줄 핵심(다음 버스 N분).
- “LLM 보조”로 맥락형 대화(날씨/시간/루틴 기반 코멘트).
- 광고는 “이스터에그”처럼 은근히, 메인 UI를 오염하지 않음.

비전: 첫날부터 유용한 습관성 앱. 방해 요소 제거, 필요한 순간에만 ‘슬쩍’ 도움과 재미를 준다.

---

## 2) 최초 사용자 온보딩 (3 Step, 버튼 ≤ 2개/화면)
Step 1 — 출발지 선택
- 입력: 주소/정류장 검색 또는 현재 위치(허용 시).
- CTA: [다음] [건너뛰기] (건너뛰기 시 임시 위치 사용 안내)

Step 2 — 도착지 선택
- 입력: 주소/정류장 검색(최근/즐겨찾기 힌트).
- CTA: [다음] [이전]

Step 3 — 주요 시간대 설정
- 입력: 평일/주말 분리 없이 “주로 탑승 시간대” 최소 1개(예: 08:10–08:50).
- CTA: [저장] [이전]
- 저장 시 생성: “오늘 경로” 카드(출발→도착, 다음 버스 ETA).

저장 직후 홈 진입:
- 첫 화면은 “오늘 경로” 카드만 노출. 불필요한 메뉴/광고 없음.

저장 데이터 (초안)
- origin: {type: stop|geo, id|latlng, label}
- destination: {type: stop|geo, id|latlng, label}
- timeslots: [{startMin: int, endMin: int}]
- consent: {location: bool, llmComments: default:true, easterEggs: default:true}

---

## 3) 심플 뷰(메인 UX) 원칙
Above‑the‑fold(첫 화면):
- 헤드라인 1줄: “다음 버스 도착까지 7분”
- 보조 텍스트(작게): “08:22, 08:35 / 노선 702A • 혼잡 보통”

하단 보조 패널(카드 3분할, 스와이프):
- 날씨: “현재 비(약함) • 23℃”
- 음악 제안: “출근 20분 집중 플레이리스트”
- LLM 추천: “오늘은 비가 오네요 ☔ 우산 챙기실래요?”

상태/에러:
- 데이터 없음 → “주변 정류장 확인 중…(재시도)”
- 지연/오류 → 단색 배지로 간단 표시(장황 금지).

금지:
- 상단 배너/전면 광고/깜빡이는 요소. 버튼은 화면당 최대 2개.

---

## 4) LLM 보조 아이디어(옵션, 언제든 끄기 가능)
목적: 똑똑한 동행자 느낌(과하지 않게).
- 트리거: 시간대 진입, 날씨 급변, 루틴 반복(3일 연속), 지연 감지.
- 코멘트 예시:
  - “오늘은 비가 오네요 ☔ 근처 카페 추천해드릴까요?”
  - “평소보다 5분 늦으셨어요. 다음 차는 08:28입니다.”
  - “혼잡이 심해요. 한 정거장 더 걸어가면 여유 좌석 확률↑”
- 제어: [끄기] [오늘 하루만 끄기] [항상 보기] 토글.
- 프라이버시: 개인 데이터는 로컬 우선, 클라우드 전송 시 명확 동의/익명화.

---

## 5) 이스터에그 광고(Soft/Delight)
원칙:
- 명시적 광고 UI 없음. 사용자가 “발견”하는 형식의 슬쩍 노출.
- 주기/강도 제한(예: 주 1회 이하, 3초 미만, 소리 없음).
- 즉시 닫기 가능, 재노출 금지 기간 적용.

예시 카피:
- “와~ 매일 이 시간을 길에서 보내시기 아깝지 않으세요? 🎶 음악 들으시면서 회사 근처 집 한 번 구경해보실래요?”
- “비 오는 날엔 따뜻한 스프가 최고죠. 정류장 앞 카페 오늘 핫 메뉴!”

형태:
- 카드 스와이프 시 한 장 “쓱~” 노출, 닫기 X 버튼 명확.
- 노출 후 피드백(좋아요/관심없음) 수집 → 개인화 강화(옵션).

가드레일:
- 안전/윤리 위반, 민감 타깃팅 금지.
- 승차 직전/운전 중 추정 타이밍엔 노출 금지.

---

## 6) 초기 A7 Business 탭(스케치, Evidence 뷰어)
목표: Evidence/ideas/* 문서를 카드형 리스트로 보여주는 뷰.
- 경로: ui/proto/atlas_A7/business.html (리스트 렌더)
- Unified 탭: unified_A1-A4_v0/index.html 에 A7 — Business 추가
- 카드 항목(요약): 제목, 날짜, 상태, 핵심 bullet 3개, “열기” 버튼(브릿지 ON 시 파일 열기, OFF 시 경로 복사).

MVP Acceptance (Business 탭):
- 파일 스캔 → 카드 렌더 → 클릭 시 열기/복사 폴백 동작.
- 이 파일(20250821_busapp_easteregg.md) 카드가 목록 첫 항목으로 노출.

---

## 7) 측정 지표(초안)
- 온보딩 완료율, 온보딩 소요시간
- Daily Open/Stickiness(월/금 비교), 출근 시간대 재방문율
- 핵심 1줄 뷰 체류시간, 재시도 클릭률
- LLM 코멘트 노출 대비 상호작용 비율(끄기율 포함)
- 이스터에그 발견율/닫기시간/피드백률(주 1회 제한 하에서)

---

## 8) 보안/프라이버시(초안)
- 위치/루틴은 로컬 저장 기본. 클라우드 학습/동기화는 옵트인.
- 광고 데이터는 맥락형(날씨/시간/공개 정보)만 사용. 개인 민감정보 금지.
- 모든 보조 발화/광고는 설정에서 언제든 OFF.

---

## 9) 구현 메모(Dev)
- 라우팅 상태: ONBOARDING → HOME_SIMPLE
- 스토리지 키(예): gg_bus.origin, gg_bus.destination, gg_bus.timeslots, gg_bus.flags
- 브릿지 연동: /api/open(status root)로 Evidence 열기 폴백
- 탭 로딩: localStorage.gg_backend_url → base= 쿼리로 iframe에 전달(기존 패턴 재사용)

---

## 10) Open Questions
- 정류장/노선 데이터 소스(공공 API) 및 캐시 정책
- 지연/혼잡 추정 로직과 근거 표기(설명가능성)
- 음악/카페 추천 파트너십 유무
- 오프라인/약한 네트워크 모드 UX

---

## 11) Changelog
- 2025-08-21 16:10Z — v0 최초 작성(아이디어, 온보딩/심플뷰/LLM/이스터에그, A7 탭 요구사항 정의). SSOT 보존.
