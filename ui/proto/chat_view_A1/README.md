# Chat View A1 — Minimal Static Prototype Spec & Plan
목적: A1 핵심 테스트(A1-T1 입력 반영, A1-T2 역할/색상 분리 출력)의 PASS 증거(스크린샷·간단 로그)를 “가장 빠르게” 수집한다.  
원칙: 즉시 판별성(Immediate Verifiability), 정적(Static) HTML/CSS/JS 한 파일 세트, 15분 타임박스.

---

## 1) 범위(Scope)
- 포함: Chat View 최소 구성요소(메시지 리스트, 입력창, 전송 버튼), 자동 스크롤, 사용자/어시스턴트 버블 클래스 분리, 시각/역할 구분.
- 제외: 네트워크 호출, 백엔드 연동, 빌드 도구. 파일 열기(file://)만으로 동작.

---

## 2) 산출물(Artifacts)
- `index.html` — 정적 마크업(레이아웃/시맨틱 구조)
- `styles.css` — 최소 스타일(버블, 컬러, 타이포, 레이아웃)
- `app.js` — 상호작용(입력 처리, 전송, DOM 삽입, 자동 스크롤, 모의 응답)

파일 배치(동일 폴더):
- gumgang_meeting/ui/proto/chat_view_A1/index.html
- gumgang_meeting/ui/proto/chat_view_A1/styles.css
- gumgang_meeting/ui/proto/chat_view_A1/app.js

---

## 3) Acceptance Criteria (즉시 판별 기준)
A1-T1 — 입력 반영(Input reflects as user bubble)
- 전송 후 1000ms 이내 사용자 버블 생성: `.chat-bubble.user:last-child`
- 버블 텍스트가 정확히 "ping"(trim 비교), 입력창 비워짐, 포커스 유지
- 버블 내 타임스탬프(HH:MM) 표시
- 자동 스크롤 최하단 유지

A1-T2 — 출력(역할/색상 분리) Assistant bubble
- A1-T1 직후 어시스턴트 버블 생성: `.chat-bubble.assistant:last-child`
- 역할/색상 분리(서로 다른 배경/테두리/아이콘/라벨) 명확
- 텍스트 대비(각 버블의 텍스트 vs 배경) ≥ 4.5:1 (WCAG 2.1 AA)
- 대화 순서 보존(사용자 → 어시스턴트)

권장 컬러 예시(접근성 보장):
- 사용자 버블: 배경 `#0EA5E9`(청록) + 본문 `#FFFFFF`
- 어시스턴트 버블: 배경 `#F3F4F6`(연회색) + 본문 `#111827`
- 라벨(“User”, “Assistant”)은 각각 버블 상단 좌측에 작은 캡션으로 표시

---

## 4) UI 구성(Selectors/Structure)
- 컨테이너: `.chat` (세로 레이아웃, 높이 100vh 내 스크롤 영역 분리)
- 메시지 리스트: `.messages` (overflow-y: auto)
- 메시지 버블:
  - 사용자: `.chat-bubble.user`
  - 어시스턴트: `.chat-bubble.assistant`
  - 공통: `.chat-bubble .content`, `.chat-bubble .meta .timestamp`, `.chat-bubble .meta .role`
- 입력 영역: `.composer`
  - 입력창: `#chatInput` (type="text")
  - 전송 버튼: `#sendBtn`

---

## 5) 동작(Behavior)
- 전송(Enter 또는 버튼): 입력값(trim) 비어있지 않으면 사용자 버블 추가 → 입력창 비우고 포커스 유지 → 자동 스크롤
- 타임스탬프: JS에서 로컬 시간 HH:MM 포맷으로 버블에 삽입
- 모의 응답: setTimeout(300~500ms)으로 어시스턴트 버블 삽입(내용 예: “pong”), 순서 보존
- 자동 스크롤: 버블 추가 시 `.messages.scrollTop = .messages.scrollHeight`

---

## 6) 수동 테스트 절차(≤ 10줄)
1) 브라우저로 `index.html`을 직접 연다(file:// 경로 허용)  
2) 입력창 포커스 → 정확히 `ping` 입력 → Enter 또는 `Send` 클릭  
3) 사용자 버블 생성 확인(텍스트, 타임스탬프, 스크롤)  
4) 즉시 어시스턴트 버블 생성 확인(역할/색상/라벨/대비/순서)  
5) 스크린샷 저장  
   - A1-T1: gumgang_meeting/ui/logs/ui_mvp_gate_YYYYMMDD/screenshots/A1-T1.png  
   - A1-T2: gumgang_meeting/ui/logs/ui_mvp_gate_YYYYMMDD/screenshots/A1-T2.png  
6) 필요 시 텍스트 대비는 브라우저 확장(Accessibility 검사) 또는 온라인 툴로 확인(≥ 4.5:1)

---

## 7) Evidence(증거) 기록 최소안
- 스크린샷 2장만 필수(A1-T1.png, A1-T2.png)
- 선택: 간단 로그 TXT/JSON(수동 작성)
  - 경로 예: gumgang_meeting/ui/logs/ui_mvp_gate_YYYYMMDD_HHMM.json
  - 기록 필드 예:
    - A1-T1: message_text, input_cleared(true/false), render_latency_ms, timestamp_text
    - A1-T2: order_preserved(true/false), role_labels_present(true/false), contrast_ratio

---

## 8) 구현 계획(Plan)
- Step 1 — 정적 틀(5분)
  - `index.html`: `.chat`, `.messages`, `.composer` 골격과 빈 리스트
  - 입력창/버튼/핸들러 연결(이벤트 바인딩)
- Step 2 — 스타일(5분)
  - `.chat-bubble.user`와 `.chat-bubble.assistant` 차별 색상/라벨/모서리/간격
  - 스크롤 영역 높이/패딩 조절, 시스템 폰트 스택 적용
- Step 3 — 상호작용(5분)
  - 사용자 버블 삽입 → 입력창 초기화/포커스 유지 → 자동 스크롤
  - setTimeout으로 어시스턴트 버블 삽입(순서 보존)
- Step 4 — 점검/스크린샷(5분)
  - A1-T1/A1-T2 체크 → 스크린샷 저장 → 선택적으로 간단 로그 기입

총합 타임박스: 15~20분

---

## 9) 품질 가드(DoR/DoD)
- Definition of Ready(시작 기준): 세 파일 생성 및 브라우저로 열 수 있음
- Definition of Done(완료 기준):
  - A1-T1/A1-T2 PASS 기준 충족
  - 스크린샷 2장 보관
  - (선택) 간단 로그 작성

---

## 10) 리스크/완화
- 파일 경로/권한 문제 → 파일을 동일 폴더에 두고 브라우저에서 직접 오픈
- 폰트/색상 UI 차이 → 시스템 폰트 스택 사용, 색상은 hex로 고정
- 대비 계산 번거로움 → 기본 제시 팔레트 사용하여 AA 충족 예상, 필요 시 온라인 툴로 확인

---

## 11) 후속(Next)
- A1 확정 후 A1-T3(스크롤), A1-T4(복사)로 확대
- 프로토타입 → 컴포넌트화(React) 이전 시, 동일 클래스/역할 라벨/동작 유지

---