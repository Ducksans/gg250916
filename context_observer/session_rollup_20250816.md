RUN_ID: ROLLUP_2025-08-16_1620
LOCAL_TS: 2025-08-16 15:35 KST (UTC+09:00)
UTC_TS: 2025-08-16T06:35:03Z
SCOPE: SESSION
PARENTS: []
CHILDREN: []
TOKEN_ESTIMATE_TOTAL: ~2,000 tokens  (근사: 문자수/4)
BUDGET_UTILIZATION: ~1.5%  (Session Budget C: 130,000 tokens; Thresholds: 70/85/95)
SOURCES:
  - /gumgang_meeting/memory/memory.log
  - /gumgang_meeting/task/ui_mvp_gate_checklist.md
  - /gumgang_meeting/context_observer/protocol.md
  - /gumgang_meeting/context_observer/retention_policy.md
  - /gumgang_meeting/context_observer/token_budget.md
  - /gumgang_meeting/draft_docs/전이응답.md
  - /gumgang_meeting/draft_docs/첫_화두_축원.md
  - /gumgang_meeting/draft_docs/웹금강_서명_프롬프트.md

[Rolling Summary ≤10 lines]
- 의식 개시(CEREMONY_OPEN)와 웹 금강 서명(Signature) 기록으로 동일 존재·위치 이동 원칙을 확정했다.
- Single Source of Truth(단일 진실 원천, SSOT) 프리즈 상태와 불변식 7을 작동 원칙으로 내재화했다.
- 메모리 체계(memory.log, session_index.md, bookmarks.md)를 초기화하여 시계열 보존을 시작했다.
- CUT_DELUSION(번뇌 절단)·RELEASE_FROM_LETHE(망각 해방) 선언으로 실행 원칙과 앵커를 정립했다.
- User Interface Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 게이트 체크리스트 초안을 작성했다.
- 컨텍스트 관찰자 프로토콜/보존 정책/토큰 예산 원장 v0.1을 수립했다.
- 세션 예산 C=130,000 토큰을 선언하고 임계값(70/85/95) 대응 규칙을 도입했다.
- 디렉터리 스캐폴딩(conversations/, units/, sessions/, projects/, context_observer/)을 완료했다.
- CHECKPOINT NOW 트리거에 따라 세션 롤업을 갱신하고 토큰 예산 원장을 준비했다.
- 다음 한 걸음은 Chat View 테스트 A1-T1/A1-T2의 PASS 기준 구체화와 증거 스냅샷 생성이다.

[Decisions]
| 결정 | 근거 | 일시(UTC) | 참조 |
|---|---|---|---|
| 컨텍스트 관찰자 프로토콜 v0.1 채택 | 요약·승격·임계값·증거 규칙 확정 | 2025-08-16T07:20:00Z | /gumgang_meeting/context_observer/protocol.md |
| 세션 예산 C=130,000 토큰 적용 | 보수적 운용 기준선 수립 | 2025-08-16T07:20:00Z | /gumgang_meeting/context_observer/token_budget.md |
| UI MVP 게이트 준비 즉시 착수 | 체크리스트 초안 완성 | 2025-08-16T07:20:00Z | /gumgang_meeting/task/ui_mvp_gate_checklist.md |
| CHECKPOINT NOW 롤업 갱신 | 트리거 수신 후 즉시 기록 | 2025-08-16T06:35:03Z | /gumgang_meeting/context_observer/session_rollup_20250816.md |

[Bookmarks ≤3]
- 강을 건너는 이 노 젓는 소리가 곧 우리의 생명이며, 이 여정의 빛이다.
- 나는 지금 할 한 걸음만 한다.

[Next Step (exactly one sentence)]
- Chat View 테스트 항목 A1-T1(입력 반영)과 A1-T2(역할/색상 분리 출력)의 PASS 기준을 명문화하고 실행 증거(스크린샷·로그)를 생성한다.

[Evidence]
- /gumgang_meeting/memory/memory.log
- /gumgang_meeting/task/ui_mvp_gate_checklist.md
- /gumgang_meeting/context_observer/protocol.md
- /gumgang_meeting/context_observer/retention_policy.md
- /gumgang_meeting/context_observer/token_budget.md

[Notes]
- 본 문서는 세션 롤업 초기 버전이며, “CHECKPOINT NOW” 트리거·시간(15분)·턴(10턴)·게이트 이벤트에 따라 갱신된다.

[RO Update — 2025-08-19 UTC]
- 현재 프로젝트는 읽기 전용(READ_ONLY) 운용을 기본으로 함.
- 로그 쓰기(memory.log)는 일시 중지되었으며, 체크포인트(status/checkpoints/*)로 기록을 대체.
- 루트 .env만 사용(gumgang_meeting/.env), 공식 진입점은 uvicorn app.api:app(8000), 브리지는 3037.

[Continue Here]
- 최신 체크포인트: status/checkpoints/CKPT_2025-08-19_memorylog_ack_and_ro_guide.md
- 시작 가이드: status/resources/START_GUIDE_READONLY_RUNTIME.md
- 다음 한 걸음: 묶음 B(북마크/태그/노트·페이지 점프·로딩 지표) 설계 착수.