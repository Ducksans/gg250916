# 🪷 Gumgang Obsidian Dashboard (Read-only)

목적
- 이 Vault는 “읽기 전용” 대시보드입니다. 덕산이 Obsidian에서 앞으로의 여정을 시각적으로 즉시 파악하고 심리적 안정감을 얻을 수 있도록 현재 위치와 다음 한 걸음을 간결하게 표시합니다.
- Single Source of Truth(단일 진실 원천, SSOT)는 `/gumgang_meeting/docs` 입니다. 본 Vault는 진행 상태를 요약·표지하는 관찰판입니다.

TL;DR (3줄)
- 현재: 의식 기록 완비 → 컨텍스트 관찰 체계(v0.1) 수립 → User Interface Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 게이트 준비 착수
- 마지막 체크포인트: 2025-08-16 15:35 KST (UTC 06:35:03)
- 다음 한 걸음: Chat View A1-T1/A1-T2 PASS 기준 명문화 + 증거(스크린샷/로그) 생성

---

시각 맵(Visual Map)
```
[TURN(싱글턴)]
      │  (2턴 이상 또는 PROMOTE CONV)
      ▼
[CONVERSATION(멀티턴)]
      │  (NEXT STEP 명시)
      ▼
[UNIT(최소 실행 단위)]
      │  (동일 목표 UNIT ≥ 2)
      ▼
[TASK(태스크)]
      │  (기간으로 묶기)
      ▼
[SESSION(세션)]
      │  (세션 ≥ 1 누적)
      ▼
[PROJECT(프로젝트)]
```

진행 인디케이터(Indicators)
- SSOT(단일 진실 원천): 🟩 Frozen(읽기 전용) → `/gumgang_meeting/docs`
- Memory(영속 로그): 🟩 Append-only → `/gumgang_meeting/memory/memory.log`
- Context Observer(관찰자): 🟩 v0.1 적용 → `protocol.md · retention_policy.md · token_budget.md`
- Token Budget(토큰 예산): C = 130,000 (추정) / 현재 사용 ~1.5% / 상태: 🟩 정상
- Gates(게이트):
  - Technology Stack Freeze Gate: 🟨 준비/확인 진행 필요(Hello World 재현·검증자 체크)
  - UI MVP Gate: 🟨 준비 중(A1 영역 테스트 기준 명문화 예정)
- Last CHECKPOINT: 2025-08-16 15:35 KST (UTC 06:35:03)

Bookmarks(북마크 ≤3)
- “강을 건너는 이 노 젓는 소리가 곧 우리의 생명이며, 이 여정의 빛이다.”
- “나는 지금 할 한 걸음만 한다.”

다음 한 걸음(Next Step — 1문장 고정)
- Chat View 테스트 A1-T1(입력 반영)·A1-T2(역할/색상 분리 출력)의 PASS 기준을 문서에 명문화하고, 실행 증거(스크린샷·로그)를 생성한다.

---

무규칙 발화 대응 — 즉시 답변 규칙
- “아까 어디까지 했었죠?”
  - 마지막 CHECKPOINT: 2025-08-16 15:35 KST (UTC 06:35:03)
  - 마지막 결정: CHECKPOINT NOW 롤업 갱신 기록
  - 다음 한 걸음: 위 Next Step 참조
  - 근거: `context_observer/session_rollup_20250816.md`
- “지금은 어디에 와 있죠?”
  - 현재 단계(2줄): 컨텍스트 관찰/보존/예산 체계 v0.1 수립, UI MVP A1 테스트 명문화 직전
  - 예산 사용률: ~1.5% (정상) · 임계값 상태: 정상
  - 다음 체크포인트 기준: 시간 15분 / 10턴 / “CHECKPOINT NOW”
- “지난번 ○○ 이어서 할까요?”
  - 절차: 롤업·요약에서 ○○ 검색 → 최신 Decisions/Next Step 확인 → 즉시 실행 또는 부족 Evidence 명시

명령(Triggers)
- CHECKPOINT NOW → 세션 롤업 즉시 갱신
- PROMOTE CONV/UNIT/TASK/SESSION/PROJECT → 승격 절차 수행(요약·링크 계승)
- NEXT STEP: {1문장} → 다음 한 걸음 갱신
- BOOKMARK: {문장} → 북마크 추가(컨테이너당 최대 3개, 중복 제거)

---

핵심 원칙(요지)
- SSOT(`/gumgang_meeting/docs`)는 기준이며 쓰기 금지(프리즈). 변경은 `/draft_docs` → 승인 → `/docs` 발행만 허용.
- 원문 기록은 `/gumgang_meeting/memory/memory.log`에 append-only.
- 요약/롤업은 줄 수 제한 준수(대화7/실행5/태스크5/세션10/프로젝트12) + Evidence(경로/줄 범위/해시/스크린샷) 필수.
- 토큰 임계값(70/85/95%)에 도달하면 단계적으로 압축 및 스니펫 축소.

참고(프로젝트 내 주요 경로 — 표시 전용)
- 진행 롤업: `/gumgang_meeting/context_observer/session_rollup_20250816.md`
- 관찰자 규정: `/gumgang_meeting/context_observer/protocol.md`
- 보존/예산: `/gumgang_meeting/context_observer/retention_policy.md`, `/gumgang_meeting/context_observer/token_budget.md`
- 게이트 체크리스트: `/gumgang_meeting/task/ui_mvp_gate_checklist.md`
- 의식 기록: `/gumgang_meeting/memory/memory.log`

사용 안내
- 이 Vault는 “읽기 전용” 대시보드로 운용합니다(편집 비권장). Obsidian에서 이 폴더(`obsidian_vault/`)를 Vault로 열어 읽기만 하세요.
- 라이브 링크가 필요하다면 프로젝트 루트(`/gumgang_meeting`)를 Vault로 열어 실제 파일을 바로 탐색할 수 있습니다.

끝문장(Anchor)
- “나는 지금 할 한 걸음만 한다.”