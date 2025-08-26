# 🪷 Where are we? — 지금 우리는 어디에 와 있나

목적
- 이 파일은 “아까 어디까지 했었죠?”, “지금은 어디에 와 있죠?”, “지난번 그 이야기 이어서 할까요?” 같은 시계열 질문에 즉시 답하기 위한 단일 창구입니다.
- Single Source of Truth(단일 진실 원천, SSOT) = `/gumgang_meeting/docs`는 기준만 담고, 진행 상황은 본 파일과 관찰/기억 파일에서 요약합니다.

TL;DR (3줄 요약)
- Bundle A(Memory Inspector RO 강화) 완료 — 루트 드롭다운/탭별 상태/Compact 기본/Orchestrator 스텁.
- 마지막 체크포인트: 2025-08-19 09:38 UTC — CKPT_2025-08-19_memorylog_ack_and_ro_guide.
- 다음 한 걸음: RO 가이드 적용 고정 + 진입점(app.api:app)/포트(3037/8000)/루트 .env 표준 확정, 이후 묶음 B(북마크·페이지 점프·로딩 지표) 착수.

현재 위치 — 스냅샷
- 세션 롤업: `context_observer/session_rollup_20250816_1608.md`
  - RUN_ID: `ROLLUP_2025-08-16_1608`
  - Last CHECKPOINT: 2025-08-17 14:36:00 KST (UTC 05:36:00)
  - Rolling Summary(롤링 요약): 10줄 제한으로 최신 상태 유지
- Token Budget(토큰 예산)
  - 세션 예산 C: 130,000 tokens (추정)
  - 현재 근사 사용량: ~2,000 tokens (≈ 1.5%)
  - 임계값(Thresholds): 70% / 85% / 95% 도달 시 단계적 압축 규칙 적용
- 결정(Decisions) — 오늘의 핵심
  - 컨텍스트 관찰자 프로토콜 v0.1 채택 → `/context_observer/protocol.md`
  - 세션 예산 C=130,000 선언 → `/context_observer/token_budget.md`
  - UI Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 게이트 준비 착수 → `/task/ui_mvp_gate_checklist.md`
  - Zed × GPT-5 컨텍스트 윈도우 운영값 272k 확정 → `status/notes/zed_gpt5_context_alignment.md`, `ui/tools/tokenizer/model_table.json`
  - CHECKPOINT NOW 롤업 갱신 기록
- 북마크(Bookmarks)
  - “강을 건너는 이 노 젓는 소리가 곧 우리의 생명이며, 이 여정의 빛이다.”
  - “나는 지금 할 한 걸음만 한다.”
- 다음 한 걸음(Next Step — 1문장 고정)
  - where_are_we 보류 스냅샷을 본문으로 승격하고, 48시간 로드맵 브리프(통합·영속화v1·Export/Backup·Publish 프로토콜·온보딩)를 작성한다.

가장 최근 실행(근거 경로, Evidence)
- 체크포인트/RO 가이드: `status/checkpoints/CKPT_2025-08-19_memorylog_ack_and_ro_guide.md`, `status/resources/START_GUIDE_READONLY_RUNTIME.md` (memory.log는 RO 정책상 비활성)
- 컨텍스트 관찰자 프로토콜 v0.1: `context_observer/protocol.md`
- 보존 정책/토큰 예산 기준선 v0.1: `context_observer/retention_policy.md`, `context_observer/token_budget.md`
- 세션 롤업(오늘): `context_observer/session_rollup_20250816_1608.md`
- UI MVP 게이트 체크리스트(초안): `task/ui_mvp_gate_checklist.md`
- 전이 응답(초안): `draft_docs/전이응답.md`
- GPT-5 컨텍스트 정렬 노트(272k 확정): `status/notes/zed_gpt5_context_alignment.md`
- Tokenizer 모델 테이블: `ui/tools/tokenizer/model_table.json`
- Tokenizer 추정기 코드(T0): `ui/tools/tokenizer/estimator.js`
- Tokenizer T0 PASS 증거: `status/evidence/ui_tokenizer_phase2_t0_pass_20250817.md`
- 스크린샷: `ui/logs/tokenizer/screenshots/`

자주 묻는 메타 질문 — 즉시 답변 규칙
1) “아까 어디까지 했었죠?”
   - 답변 포맷:
     - 마지막 CHECKPOINT: [시간]
     - 마지막 결정: [결정 1문장]
     - 다음 한 걸음: [1문장]
     - 근거: [롤업/태스크/로그 경로]
   - 출처: `context_observer/session_rollup_YYYYMMDD.md`의 [Decisions]/[Next Step]

2) “지금은 어디에 와 있는 거죠?”
   - 답변 포맷:
     - 현재 단계 요약(2줄): [롤링 요약 앞 2줄]
     - 예산 사용률: [~X.X%], 임계값 상태: [정상/경보]
     - 다음 체크포인트 기준: 시간 15분 / 10턴 / “CHECKPOINT NOW”
   - 출처: 세션 롤업 헤더 및 Token Budget 원장

3) “지난번에 이야기하던 ○○ 이어서 할까요?”
   - 절차:
     - conv/rollup에서 키워드 ‘○○’ 검색 → 가장 최신 관련 [Decisions]/[Next Step] 확인
     - 실행 준비 완료면 바로 ‘Next Step’ 집행 제안, 아니면 부족한 Evidence 명시
   - 출처: `context_observer/conv_summary_*`(생성 시), 세션 롤업, `memory/memory.log`

무규칙 발화(드리프트) 대응 — 4단계 그라운딩
- G1) 시간 정렬: 마지막 CHECKPOINT 시각/결정/다음 한 걸음 3요소를 20초 내 복기
- G2) 범위 고정: 현재 SCOPE를 {CONV|UNIT|TASK|SESSION|PROJECT} 중 하나로 명시
- G3) 선택 축소: 1문장 Next Step만 제시(복수 후보 시 1개로 합의)
- G4) 증거 고정: Evidence 경로 1개 이상 첨부(파일/라인/로그)

명령(트리거) 요약
- CHECKPOINT NOW → 세션 롤업 즉시 갱신
- PROMOTE CONV/UNIT/TASK/SESSION/PROJECT → 승격 절차 수행(요약·링크 계승)
- NEXT STEP: {1문장} → 다음 한 걸음 갱신
- BOOKMARK: {문장} → 북마크 추가(컨테이너당 최대 3개, 중복 제거)

불변 원칙(요지)
- SSOT(`/docs`) 쓰기 금지, 운영 문서는 `/draft_docs` → 승인 → `/docs`로 발행
- 원문 기록은 `/memory/memory.log` append-only
- 요약/롤업은 줄 수 제한 준수, Evidence 경로 필수
- 임계값(70/85/95%) 도달 시 단계적 압축 및 증거 축소

현재 세션 — 한 눈에 보기
- 마지막 CHECKPOINT: 2025-08-19 18:38:09 KST (UTC 09:38:09) — CKPT_2025-08-19_memorylog_ack_and_ro_guide
- 진행 상태(2줄)
  - RO 운용 정리: 루트 .env만 사용, 쓰기 차단, Memory Inspector RO 강화
  - 진입점 표준 확정: app.api:app(8000) / 브리지 3037, Bundle A 완료
- Next Step(1문장): 묶음 B(북마크/태그/노트·페이지 점프·로딩 지표) 설계 착수, 동시에 레거시 진입점/포트 문서에 DEPRECATED 표기
- 예산: ~1.5% 사용(정상)

업데이트 규칙
- 이 파일은 세션이 “CHECKPOINT NOW”를 맞을 때마다 갱신됩니다.
- 갱신 항목: 마지막 체크포인트 시각, 3줄 요약, 결정 1~3개, Next Step 1문장, 예산 근사치

참고 경로(오늘)
- `context_observer/session_rollup_20250816_1608.md`
- `status/evidence/전이확정선언_20250816.md`
- `status/evidence/ui_mvp_gate_20250816_report.md`
- `ui/logs/ui_mvp_gate_20250816_1624.json`
- `context_observer/protocol.md`
- `context_observer/retention_policy.md`
- `context_observer/token_budget.md`
- `task/ui_mvp_gate_checklist.md`
- `memory/memory.log`

끝문장 — 흔들릴 때 하나만 붙잡기
- “나는 지금 할 한 걸음만 한다.”