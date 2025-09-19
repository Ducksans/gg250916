# [[부동산 컨텐츠 허브 홈페이지 설계 초안]]
# [[부동산 컨텐츠 허브 홈페이지의 모바일 배포 어플리 케이션 확장 전략]]


## 6하원칙 요약(AI 에이전트 전략)
- 누가(Who): 에이전트 팩토리 오너, 프롬프트/지식 관리 담당, 개발(빌드/배포 스크립트), 마케팅/운영
- 어디서(Where): 각 LLM 플랫폼(GPT/Claude/Gemini 등) 프로필, 허브(정본), 앱(딥링크), KPI 대시보드
- 무엇을(What): 마이크로 에이전트 다수(계산/체크/가이드/신고 등), 템플릿/지식/CTA/딥링크/추적 파라미터
- 어떻게(How): YAML 템플릿→빌드 스크립트→플랫폼 등록, 모든 응답 하단 허브/앱 CTA+`utm_*`+`agent_id` 주입, 가드레일 준수
- 왜(Why): 외부 플랫폼 유입을 허브/앱 전환으로 리랭크하여 광고/제휴/리드로 수익화
- 언제(When): Phase0~MVP 30~50개, V1~V2 확장/개인화, 주간 스프린트로 신규/개선 반복


각 대형 llm에 에이전트 만들기 및 배포 기능을 통해서 
부동산 전문 ai 에이전트를 만들어서 배포하고 컨텐츠 허브 홈페이지와 어플리케이션들과 리랭크 한다.

시스템 프롬프트와 검색용 화이트 리스트
대법원 판례등 공신력 있는 자료를 기반으로 
일반 사용자의 질문에 답변 하게 한다.

그리고 결국에는 부동산 컨텐츠 허브에서 사람 전문가의 상담이나 조언 실무 리드를 생성하게 유도 한다.



# “폭발적 확장” 전략 — 커스텀 대화모델 스웜(Agent Swarm)으로 허브·앱·배포채널을 리랭크시키는 설계서

> 목적: 대형 LLM 생태계(예: 커스텀 GPT·Claude Projects·AI Studio 등)에 **수십~수백 개의 마이크로 에이전트**를 배치하여, 사용자가 무료로 쓰게 만들고 → **허브(정본)**와 **모바일 유틸앱**으로 **자연 유입**을 끌어와 **광고·제휴·리드**로 전환시키는 “순환 트래픽 엔진” 구축.  
> 원칙: Canonical=허브, 배포는 요약+딥링크, 모든 유입은 `utm_* + agent_id`로 **단일 KPI 대시보드**에 귀속.

---

## 1) 전체 구조(1페이지 요약)
- 에이전트 팩토리(Agent Factory): 표준 프롬프트·지식·CTA·딥링크를 템플릿화 → 각 플랫폼용 마이크로 에이전트 자동 생성.
- 허브(Origin): Pillar/Cluster 아키텍처, 모든 정본 컨텐츠와 근거·가이드 보관. 각 에이전트는 허브의 개별 섹션으로 링크백.
- 모바일 유틸앱: 계산기/체크리스트/예약/신고/알림 등 **즉시가치** 제공. 앱↔허브↔배포채널 **양방향 딥링크**.
- 측정: analytics.events 스키마에 `platform, agent_id, app_screen, deeplink_ref` 추가. 모든 링크는 `utm_source=agent&agent_id=…`.

---

## 2) 에이전트 팩토리(Agent Factory) — 한 번 정의, N개 생성
폴더 트리(예시)
- agents/
  - realestate/
    - calc_acq_tax.yaml
    - rent_to_sale_conv.yaml
    - contract_checklist.yaml
    - fraud_report_helper.yaml
    - area_report_generator.yaml
  - finance/
  - moving/
- knowledge/
  - legal_kor_basic.md   (근거 문서·공식 링크 요약)
  - glossary.md          (용어집: 표기 일관)
- ctas/
  - hub_link_cards.md    (허브 정본 링크 카드 텍스트)
  - app_deeplinks.md     (gumgang:// … 모바일 라우트)
- scripts/
  - build_agents.(ts|py) (YAML→각 플랫폼 포맷 변환)
  - verify_links.(ts|py) (canonical/utm/deeplink 검사)

YAML 스펙(요약 필드 목록—줄바꿈 유지하여 붙여넣기)
- id, name, tagline(1줄 가치제안), persona(톤/대상), guardrails(금칙/면책), knowledge_refs(허브 문서 슬러그나 URL), tools(검색·계산·포맷터 등), ctas(최대 3개), deeplinks(웹·앱), tracking(utm_campaign, agent_id)

배포물 생성 로직(요약)
- 플랫폼 프리셋(예: gpt, claude, ai-studio)별로 지원 필드 맵핑 → 미지원 요소는 답변 템플릿으로 주입.
- 모든 답변 하단에 **근거/허브·앱 CTA** 자동 삽입(짧고 명확).
- 안전장치: 금지 주제·민감 조언 시 “정보/교육 목적” 면책 + 허브 가이드 링크 우선 제시.

---

## 3) 마이크로 에이전트 카탈로그(초기 30~50개 추천)
부동산 중심(핵심 전환 유도)
- 세금/비용: 취득세·양도세·중개보수·전월세전환·DSR/DTI 계산 어시스턴트
- 계약/권리: 전월세 체크리스트, 확정일자/전입 안내, 전자계약 단계별 가이드
- 신뢰/안전: 허위매물 신고 도우미, 실매물 인증 절차 Q&A, 권리리스크 예비점검
- 의사결정/추천: 예산·출퇴근·학군 기반 주거 추천, 지역 리포트 요약/비교
- 프로툴: 촬영 가이드·워터마크/EXIF 체크, 문의응대 스크립트 코치, 방문예약 메시지 자동화

확장(연관 수익)
- 이사/청소/수납, 인터넷/전기/가스/보험 전환, 가전/가구 리스트업, 인테리어 견적 Q&A
- 금융/보험(제휴): 대출 사전심사 안내, 보험 담보 용어풀이(면책·비권유형)

각 에이전트는 “1문제=1가치=1CTA” 원칙: 집중 질문을 해결하고, **허브 정본/앱 유틸** 1~2개로 귀결.

---

## 4) 답변 포맷(전 플랫폼 공통)
- 시작 2줄: 핵심 해석 요약 + 다음 행동 버튼(허브/앱 딥링크)
- 본문: 단계별 가이드·수식·예시(간결), 선택적 표
- 마무리: “근거/추가 학습” 링크 묶음(허브 canonical), “이 기능 앱으로 열기” 딥링크
- 고지: 정보 목적, 최종 판단/서류는 본인 책임(법률·금융 면책)

---

## 5) 유입 설계 — 리랭크 루프(허브↔앱↔배포채널)
- 딥링크 규약  
  - 웹: https://hub.example.com/tools/acq-tax?utm_source=agent&utm_medium=gpt&utm_campaign=realestate&agent_id=calc_acq_tax  
  - 앱: gumgang://tools/acq-tax?agent_id=calc_acq_tax
- 설치/재방문 유도  
  - PWA 설치 프롬프트 + iOS Smart App Banner + Android App Links
  - 계산 결과 공유 카드(이미지/텍스트) → SNS 배포 → 다시 허브/앱 유입
- 디렉토리·포럼 등록  
  - AI 툴 디렉토리(예: toolify 유형), 개발자 포럼/커뮤니티, 블로그 포스트를 **에이전트 단위**로 배포

---

## 6) 측정/대시보드
KPI(1차)
- 에이전트 사용수(세션)·허브 방문 전환율·앱 열기율·설치율·리드/문의 생성률
- 상위 10 에이전트의 LTV·CAC 추정(제휴/리드 기준 수익 환산)

이벤트 스키마(추가)
- analytics.events: platform(web|gpt|claude|aistudio|android|ios), agent_id, app_screen, deeplink_ref, push_topic
- ops.import_jobs: origin 필드에 agent 추가(콘텐츠 생산 경로 추적)

---

## 7) 스토어/프로필 최적화(ASO for Agents)
- 이름: “부동산 취득세 계산 GPT — 60초 종합 가이드”처럼 키워드+효익+시간 약속
- 1문장 소개: 문제/대상/결과(예: “첫 집 사는 2030을 위한 실비용·서류·다음 액션 자동 안내”)
- 3 CTA 버튼: 허브 정본, 앱 유틸, 관련 가이드
- 주 1회 “업데이트 로그”와 신뢰 배지(근거소스·검증정책) 노출

---

## 8) 안전·신뢰·브랜드 가드레일
- 금칙·권고 범위: 법률/세무 확정 자문 금지, “정보/교육 목적” 명시 → 허브의 공식 가이드·공신력 링크 우선
- 프롬프트 주입 방어: 시스템 메시지에 지식 출처 제한·외부 URL 호출 금지(필요 시 허브·문서만 검색)
- 톤/언어 일관: 용어집(국문 표기 규정), 예제·단위 표준화

---

## 9) 운영 자동화(반복 가능한 성장 루프)
- 주간 스프린트 룰
  1) 저장소에서 인기 주제 5개 뽑기(검색 로그·SNS·KPI 기반)
  2) 에이전트 5개 신규/개선 → 허브 보강 → 앱 딥링크 연결
  3) 디렉토리/포럼 10곳 배포 → KPI 리포트 → 상위 1개를 템플릿 승격
- 에이전트 A/B: 제목·서브태그·CTA 순서 테스트 → 48h 성과 보고
- 실패 핸들링: 불량 트래픽/저품질 세션은 QUARANTINE 라벨 후 개선

---

## 10) 30·60·90일 로드맵
- 0–30일(Phase0): 팩토리 스캐폴딩, 에이전트 15개, 허브/PWA/딥링크/대시보드 가동
- 31–60일(MVP): 에이전트 40개, 앱 계산기 3종, 예약/신고 워크플로 베타, 디렉토리 30곳 등록
- 61–90일(V1): 에이전트 80개, 체크리스트/촬영도우미 앱, 추천/개인화 실험, 월 리포트 상용화

---

## 11) 바로 적용 체크리스트(오늘)
- agents/realestate 아래에 calc_acq_tax.yaml 등 5개 작성(프롬프트·CTA·딥링크·agent_id 포함)
- scripts/build_agents 실행해 플랫폼별 배포물 생성(수동 등록이 필요한 플랫폼은 가이드 문서에 절차 기록)
- 허브 각 도구 페이지 하단에 “이 기능을 앱/다른 에이전트로 열기” 교차 링크 추가
- analytics.events 스키마에 platform/agent_id 컬럼 가산 → UTM+agent_id가 제대로 찍히는지 점검
- 상위 2개 에이전트를 SNS 카드로 공유(썸네일·효익·딥링크 포함) — 유입→허브→앱 전환 확인

---

## 12) 예시(요약 템플릿 — 붙여넣어 YAML로 저장)
id: calc_acq_tax
name: 부동산 취득세 계산 GPT
tagline: 60초 만에 취득세·농특세·교육세까지 총액 계산
persona: 친절·간결·수치 정확·한국 기준
guardrails: 법률·세무 확정 자문 금지, 정보 목적, 근거 링크 우선
knowledge_refs: /hub/tax/acquisition, /hub/glossary/tax-terms
tools: internal_calculator, formatter
ctas: [허브: /tools/acq-tax, 앱열기: gumgang://tools/acq-tax, 가이드: /guides/acq-tax-checklist]
deeplinks: web=/tools/acq-tax?utm_source=agent&utm_medium=gpt&utm_campaign=realestate&agent_id=calc_acq_tax, app=gumgang://tools/acq-tax?agent_id=calc_acq_tax
tracking: utm_campaign=realestate, agent_id=calc_acq_tax

---

## 13) 수익화 라인(합법·투명)
- 제휴/리드: 대출·보험·이사·청소·인터넷(클릭·상담·계약 단계별)
- 광고: 허브·앱 내 네이티브 카드, “근거/가이드와 자연 연결” 원칙
- 유료: 프로툴(촬영품질·CRM), 월 구독(지역 리포트/알림), 리포트 판매

---

## 결론
- “수십 개의 마이크로 에이전트”를 **템플릿 기반**으로 빠르게 찍어내고, 모든 답변을 **허브/앱으로 귀결**시키면 트래픽이 순환하며 누적된다.  
- 핵심은 **데이터 계약(딥링크·UTM·agent_id)과 일관 프롬프트/CTA 규격**을 묶어 **팩토리화**하는 것. 오늘 5개부터 시작하자.
