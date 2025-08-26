# 🪷 UI Minimum Viable Product Gate — Checklist Draft
> 목적: User Interface Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 요구사항을 즉시 판별형 테스트로 검증하기 위한 태스크 문서  
> 참조: /gumgang_meeting/docs/8_UI_MVP_요구사항.md, /gumgang_meeting/docs/9_UI_MVP_게이트.md, /gumgang_meeting/docs/5_전환게이트_의미.md

-------------------------------------------------------------------------------

메타데이터
- RUN_ID: UI_MVP_GATE_{{YYYYMMDD_HHMM}}
- 일시(로컬/UTC): {{LOCAL_DATETIME}} / {{UTC_DATETIME}}
- 검증자(Verifier): {{NAME}}
- 입회자(Witness, 선택): {{NAME}}
- 환경: React + Tailwind CSS + Zustand + JSON(File) + Zed Editor
- SSOT: Single Source of Truth(단일 진실 원천, SSOT) = /gumgang_meeting/docs (읽기 전용)

이중 기록(Dual Logging)
- 결과 보고서(마크다운): /gumgang_meeting/docs/gates_log/ui_mvp_gate_{{YYYYMMDD}}.md
- 런 로그(JSON 또는 TXT): /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD_HHMM}}.json
- 무결성: 결과 보고서 하단에 런 로그 파일명 및 SHA-256 해시 기록

-------------------------------------------------------------------------------

즉시 판별형 테스트 프로토콜(15분 내 완료 원칙)
1) 준비
   - 빌드/실행: UI를 로컬에서 실행 가능한 상태로 준비 (재현 절차 간단 메모 추가)
   - 초기 상태: 빈 세션 1개 생성 가능, 휘발성 캐시 초기화(있다면)
2) 실행
   - 아래 체크리스트를 순서대로 수행하고, 각 항목마다 PASS/FAIL 즉시 표기
   - 증거(Evidence): 스크린샷 경로 또는 로그 라인 번호를 메모
3) 기록
   - 요약 섹션에 통과율(%) 계산
   - 이중 기록 위치에 동시 저장
4) 판정
   - 필수 항목 100% 통과 시 “GATE PASSED”
   - 1개라도 FAIL이면 “GATE FAILED”로 기록하고, 재시도 계획 첨부

-------------------------------------------------------------------------------

A. 요구사항 ↔ 테스트 매핑(필수)
A-1. Chat View (대화 창)
- 요구사항 요약:
  - 입력/출력/스크롤/복사 기능 제공
- 테스트
  - [ ] A1-T1 입력: 채팅 입력창에 “ping” 입력 후 전송 → 메시지 버블로 즉시 반영됨
        PASS 기준:
          1) 전송 후 1000ms 이내 사용자 버블(.chat-bubble.user:last-child) 생성
          2) 버블 텍스트가 정확히 "ping"과 일치(트림 비교), 입력창 비워짐(focus 유지)
          3) 타임스탬프(HH:MM) 표기, 자동 스크롤 최하단
        증거(스키마):
          screenshot: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD}}/screenshots/A1-T1.png
          log_ref: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD_HHMM}}.json#A1-T1
          dom_selector: .chat-bubble.user:last-child
          note: {{optional}}
  - [ ] A1-T2 출력: 시스템/모델 응답이 별도 버블로 렌더링됨(역할/색상 차별)
        PASS 기준:
          1) assistant/시스템 버블(.chat-bubble.assistant:last-child)이 사용자 버블과 다른 클래스/컨테이너
          2) 시각적 구분: 서로 다른 배경색/테두리/아이콘 및 역할 라벨 표시, 대비비(contrast) ≥ 4.5:1
          3) 응답 순서: A1-T1 직후 하단에 추가, 대화 순서 보존
        증거(스키마):
          screenshot: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD}}/screenshots/A1-T2.png
          log_ref: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD_HHMM}}.json#A1-T2
          dom_selector: .chat-bubble.assistant:last-child
          colors:
            user_bg: {{hex}}
            assistant_bg: {{hex}}
            contrast_ratio: {{float}}
          note: {{optional}}
  - [ ] A1-T3 스크롤: 대화가 길어질 때 최하단 자동 스크롤 및 수동 스크롤 가능
        증거: 메모: {{note}}
  - [ ] A1-T4 복사: 메시지 버블 우측 상단 복사 버튼으로 텍스트 클립보드 복사됨
        증거: 메모: {{note}}
- 판정: [ ] PASS  [ ] FAIL  (실패 시 원인:)

A-2. Session and Task View (세션/태스크 관리)
- 요구사항 요약:
  - 세션 목록 표시, 생성/삭제/조회
  - 태스크 생성, 상태 토글(진행↔완료)
- 테스트
  - [ ] A2-T1 세션 생성: “New Session” 클릭 → 목록에 즉시 반영, 선택 시 대화영역 초기화
        증거: 스크린샷: {{path}}
  - [ ] A2-T2 세션 삭제: 특정 세션 삭제 → 목록/상태 동기 반영
        증거: 메모: {{note}}
  - [ ] A2-T3 태스크 생성: 현재 세션에서 태스크 제목 입력 → 리스트 즉시 추가
        증거: 스크린샷: {{path}}
  - [ ] A2-T4 태스크 상태 토글: 체크박스 클릭 시 진행↔완료 상태 즉시 전환, 스타일/아이콘 반영
        증거: 메모: {{note}}
- 판정: [ ] PASS  [ ] FAIL  (실패 시 원인:)

A-3. Tools Panel (실행 도구 패널)
- 요구사항 요약:
  - 실행 가능한 도구 목록 표시, 실행 버튼, 결과 출력
- 테스트
  - [ ] A3-T1 도구 목록 표시: 최소 1개 테스트 도구(예: “Echo Tool”)가 목록에 보임
        증거: 스크린샷: {{path}}
  - [ ] A3-T2 실행: “Run” 클릭 시 상태가 Running → Idle로 전환되고, 결과가 우측/하단에 출력
        증거: 로그: {{line_ref}}
  - [ ] A3-T3 오류 처리: 의도적 실패 입력 시 사용자 친화적인 에러 메시지와 상태 복구
        증거: 메모: {{note}}
- 판정: [ ] PASS  [ ] FAIL  (실패 시 원인:)

A-4. Status and Log Area (상태/로그 영역)
- 요구사항 요약:
  - 현재 상태(실행 중/대기 중) 표기, 로그 기록 자동 출력 및 저장
- 테스트
  - [ ] A4-T1 상태 전환: 도구 실행 시 “Running” → 완료 후 “Idle”로 자동 전환
        증거: 스크린샷: {{path}}
  - [ ] A4-T2 로그 출력: 실행/응답/에러가 시간순으로 누적 출력됨(최근 항목 상단 또는 하단 일관)
        증거: 메모: {{note}}
  - [ ] A4-T3 로그 저장: “Export Log” 클릭 시 파일 생성(경로/파일명 표준 준수)
        증거: 파일: {{export_path}}
- 판정: [ ] PASS  [ ] FAIL  (실패 시 원인:)

A-5. Persistence (세션 저장/복원, 로그 내보내기)
- 요구사항 요약:
  - 세션 저장/불러오기, 로그 Export
- 테스트
  - [ ] A5-T1 저장: 현재 세션 저장 수행 → 파일/스토리지에 기록 확인(JSON 스키마 유효)
        증거: 파일: {{session_file}}
  - [ ] A5-T2 복원: 저장했던 세션 불러오기 → 대화/태스크/도구 이력 복원
        증거: 스크린샷: {{path}}
  - [ ] A5-T3 로그 내보내기: Export to file 수행 → 지정 폴더에 생성 및 열람 가능
        증거: 파일: {{export_path}}
- 판정: [ ] PASS  [ ] FAIL  (실패 시 원인:)

-------------------------------------------------------------------------------

B. 확장 요구사항 ↔ 테스트 매핑(권장)
B-1. Search Function (검색)
- 테스트
  - [ ] B1-T1 키워드 검색: 로그/세션/태스크에서 “keyword” 검색 → 하이라이트/필터링
        증거: 스크린샷: {{path}}
- 판정: [ ] PASS  [ ] FAIL  (비고:)

B-2. Progress Visualization (시각화)
- 테스트
  - [ ] B2-T1 진행도 표시: 완료/전체 태스크 비율 바/원형 차트 렌더링
        증거: 스크린샷: {{path}}
- 판정: [ ] PASS  [ ] FAIL  (비고:)

B-3. Multi-language Support (다국어)
- 테스트
  - [ ] B3-T1 언어 전환: 한국어↔영어 토글 → 주요 UI 텍스트 즉시 반영, 세션 데이터는 보존
        증거: 스크린샷: {{path}}
- 판정: [ ] PASS  [ ] FAIL  (비고:)

-------------------------------------------------------------------------------

C. 불변식/프로토콜 준수 체크
- [ ] C1 SSOT 준수: /gumgang_meeting/docs는 읽기 전용(프리즈), 테스트 중 직접 쓰기 없음
- [ ] C2 언어 규칙: 용어 첫 등장 시 풀네임(영문) → 한국어 설명 → 약칭 표기
- [ ] C3 기술 스택 동결 준수: React/Tailwind/Zustand/JSON/Git 이탈 없음
- [ ] C4 이중 기록: 보고서(/docs/gates_log)와 런 로그(/ui/logs) 동시 저장
- [ ] C5 무결성: 런 로그 파일 SHA-256 계산 및 보고서에 기록
- [ ] C6 재현 가능성: 빌드/실행 절차 5줄 이내 메모 첨부

-------------------------------------------------------------------------------

결과 요약
- 필수 항목 통과 수: {{X}} / {{총 항목 수}}  → 통과율: {{XX}}%
- 판정: [ ] GATE PASSED  [ ] GATE FAILED
- 주요 결함(실패 항목 번호와 원인 요약):
  1) {{A?-T?}} — {{원인}}
  2) {{A?-T?}} — {{원인}}
- 즉시 개선/재시도 계획(담당/기한):
  - {{PLAN 1}}
  - {{PLAN 2}}

-------------------------------------------------------------------------------

증거(Evidence) 인덱스
- 스크린샷 디렉터리: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD}}/screenshots/
- 런 로그 파일: /gumgang_meeting/ui/logs/ui_mvp_gate_{{YYYYMMDD_HHMM}}.json
- 런 로그 해시(SHA-256): {{HASH}}

-------------------------------------------------------------------------------

서명(Sign-off)
- 검증자(Verifier): {{서명}} / 일시: {{LOCAL_DATETIME}}
- 입회자(Witness): {{서명}} / 일시: {{LOCAL_DATETIME}}

비고
- 본 체크리스트는 즉시 판별성(Immediate Verifiability)을 최우선으로 설계되었으며, /gumgang_meeting/docs의 8_UI_MVP_요구사항.md와 9_UI_MVP_게이트.md를 1:1로 대응한다.
- 필수 항목 100% 충족 시에만 게이트 통과로 기록한다.