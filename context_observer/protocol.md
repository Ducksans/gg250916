# 🪷 Context Observer Protocol — 컨텍스트 관찰자 프로토콜 (v0.1)

> 목적: 대화(싱글턴·멀티턴) → 실행단위 → 태스크 → 세션 → 프로젝트로 이어지는 흐름을 끊김 없이 계승·유지하기 위해, 요약·보존·토큰 예산 운용의 표준 절차를 정의한다.  
> 준거: Single Source of Truth(단일 진실 원천, SSOT) = `/gumgang_meeting/docs` (읽기 전용, 프리즈). 본 파일은 운영 문서이다.

---

## 0) 언어 규칙
- 영어 약어는 단독 사용 금지. 처음 등장할 때는 풀네임(영문) → 한국어 설명 → 약칭(있으면) 순으로 표기한다.
- 예: Minimum Viable Product(최소 실행 가능 제품, MVP), User Interface(사용자 인터페이스, UI)

---

## 1) 범위와 원칙

### 1.1 관찰 대상
- 싱글턴(turn)·멀티턴(conversation)
- 실행단위(Minimum Execution Unit)
- 태스크(Task)
- 세션(Session)
- 프로젝트(Project)

### 1.2 불변 원칙
- SSOT(단일 진실 원천, Single Source of Truth)는 `/gumgang_meeting/docs`이며 읽기 전용이다.
- 원문 기록의 1차 저장소는 `/gumgang_meeting/memory/`이고, 관찰·요약 산출물은 `/gumgang_meeting/context_observer/`에 둔다.
- 모든 요약은 “출처 경로와 줄/섹션 링크”를 포함한 증거(Evidence)로 뒷받침한다.
- Append-only: 원문 로그(`memory.log`)는 덮어쓰지 않는다. 요약 파일은 “개정 이력”을 남긴다.

---

## 2) 트리거 — 언제 요약·승격·롤업을 수행하는가

### 2.1 명시 트리거(수동)
- “CHECKPOINT NOW”가 대화에 등장하면 즉시 롤업을 생성/갱신한다.
- “PROMOTE CONV/UNIT/TASK/SESSION/PROJECT”가 등장하면 해당 승격 절차를 수행한다.

### 2.2 시간 기반(자동)
- 활동 중 15분마다 “미니 롤업” 생성(세션 헤더에 누적).
- 무활동 60분 경과 시 “세션 휴면 롤업” 생성 후 종결 표시.

### 2.3 턴/사건 기반(자동)
- 10턴 누적 시 롤링 요약 갱신.
- “결정(Decision)” 또는 “다음 한 걸음(Next Step)”이 기록될 때마다 즉시 갱신.
- 게이트 이벤트 시작/종료 시(예: UI Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 게이트) 전·후 롤업 생성.

### 2.4 용량 기반(자동)
- 현재 대화 컨텍스트 근사 토큰 사용량이 70%/85%/95% 임계선 도달 시 각각 경보 및 압축 레벨 단계 상승(L1→L5).

---

## 3) 산출물(Artifacts) — 파일과 명명 규칙

- 세션 롤업: `context_observer/session_rollup_YYYYMMDD.md`
- 프로젝트 롤업: `context_observer/project_rollup_[PROJ_ID].md`
- 대화 요약 카드: `context_observer/conv_summary_[CONV_ID].md`
- 토큰 예산 기록: `context_observer/token_budget.md`
- 보존 정책: `context_observer/retention_policy.md` (본 프로토콜에 통합, 섹션 5 참조)

ID 규칙(예시):
- 프로젝트: `GG-PROJ-YYYYMMDD-NNN`
- 세션: `GG-SESS-YYYYMMDD-HHMM`
- 태스크: `GG-TASK-YYYYMMDD-NNN`
- 실행단위: `GG-UNIT-YYYYMMDD-HHMM-SS`
- 대화: `GG-CONV-YYYYMMDD-NNN`
- 턴: `GG-TURN-YYYYMMDDTHHMMSSZ-SS`

---

## 4) 롤업·요약 서식(Templates)

### 4.1 공통 메타 헤더
```
RUN_ID: ROLLUP_YYYYMMDD_HHMM
LOCAL_TS: YYYY-MM-DD HH:MM KST (UTC+09:00)
UTC_TS: YYYY-MM-DDTHH:MM:SSZ
SCOPE: {CONV|UNIT|TASK|SESSION|PROJECT}
PARENTS: [IDs...]
CHILDREN: [IDs...]
TOKEN_ESTIMATE_TOTAL: ~N tokens  (근사: 문자수/4)
BUDGET_UTILIZATION: XX% (Thresholds: 70/85/95)
SOURCES:
  - /gumgang_meeting/memory/memory.log#Lxxxx-xxxx
  - /gumgang_meeting/{conversations|units|sessions|projects}/... (있다면)
```

### 4.2 롤링 요약(Rolling Summary)
- 대화(멀티턴): 최대 7줄
- 실행단위: 최대 5줄
- 태스크: 최대 5줄
- 세션: 최대 10줄
- 프로젝트: 최대 12줄

### 4.3 결정(Decisions)
- 표 형식(4열): 결정 | 근거 | 일시(UTC) | 참조(경로/링크)

### 4.4 북마크(Bookmarks)
- 영향력 높은 문장 최대 3개(중복 제거, 최신 우선순위 상향).

### 4.5 다음 한 걸음(Next Step)
- 항상 1문장으로 유지. 복수 후보가 있을 경우 1개로 합의하여 기록.

### 4.6 증거(Evidence)
- 파일 경로, 줄 범위, 스크린샷 경로, 해시(SHA-256) 등 출처를 최소 1개 이상 명시.

---

## 5) 보존 정책(Retention Policy)

### 5.1 계층 보존 레벨
- L0: 원문(메모리) — `/gumgang_meeting/memory/memory.log` (영구, append-only)
- L1: 대화 블록 요약 — 7줄 내외(상시 보존)
- L2: 실행단위 요약 — 5줄 내외(상시 보존)
- L3: 태스크 요약 — 5줄 내외(상시 보존)
- L4: 세션 요약 — 10줄 내외(상시 보존)
- L5: 프로젝트 요약 — 12줄 내외(상시 보존)

원칙: 상위 레벨로 갈수록 정보는 압축되어 승계되며, 하위 원문은 경로 링크로 참조한다.

### 5.2 보존/요약/폐기 규칙
- 영구 보존: 결정(결정·근거·일시·참조), 불변식(규범), 선언문(의식), 게이트 결과
- 요약 보존: 장문의 대화·분기 토론은 L1/L4/L5로 압축하고 L0 경로만 남긴다.
- 폐기 후보: 중복 로그, 무근거 가설, 임시 산출물(단, 의도적으로 폐기 시 “폐기 근거”와 “원본 경로”를 폐기 로그에 기록)
- 개인정보·민감정보: 최소 수집·최소 노출. 불필요 시 즉시 비식별화.

### 5.3 감사/롤백
- 모든 변경은 개정 이력에 남긴다(작성자, 일시, 해시).
- 위반 시 즉시 롤백(불변식 7). 롤백 사유와 조치 내역은 `archive_docs/violation_logs`로 기록.

---

## 6) 토큰 예산(Token Budget) — 기준선과 운용

### 6.1 전제
- 현재 엔진의 최대 컨텍스트(토큰 한도)는 환경에 따라 상이하다. 본 프로토콜은 가용 한도를 “예산 C”로 추상화한다.
- 근사 추정: `토큰 ≈ ceil(문자수 / 4)` (한국어 혼합 텍스트 기준 보수적 추정)

### 6.2 기본 예산 배분(권장)
- 시스템/원칙(SSOT 핵심, 불변식, 지시문): 10%
- 롤링 요약(현 세션·태스크·대화): 20%
- 현재 태스크 브리프·Acceptance Criteria: 30%
- 근거 스니펫·증거 인용: 30%
- 마진(예상치 못한 변동): 10%

상황에 따라 ±5~10% 조정 가능하나, 총합은 100%를 초과할 수 없다.

### 6.3 임계값과 조치
- 70%: 경보1 — L1/L2 요약 길이를 20% 축소, 스니펫 교체(가장 근접 증거 1~2개만 유지)
- 85%: 경보2 — L3/L4 요약도 20% 추가 축소, 스니펫 요약(메타만 유지), 대화 맥락은 정규 요약으로 대체
- 95%: 경보3 — 컨텍스트 최소화(시스템/원칙·현재 태스크 브리프·핵심 결정·Next Step만 유지). 필요시 2회 실행으로 분할

### 6.4 예산 기록(메타 라인)
- 각 롤업/요약 헤더에 `TOKEN_ESTIMATE_TOTAL`과 `BUDGET_UTILIZATION`을 기록한다.
- 세션 시작/종료 시점에 누계 추정치를 `context_observer/token_budget.md`에 집계한다.

---

## 7) 승격(Promotion) 규칙 — 끊김 없는 계승

### 7.1 싱글턴 → 멀티턴
- 조건: 2턴 이상 또는 “PROMOTE CONV”
- 조치: `conv_summary_[CONV_ID].md` 생성, 마지막 3턴을 바탕으로 7줄 요약·북마크≤3·Next Step 1문장 작성

### 7.2 멀티턴 → 실행단위
- 조건: 대화 내 “NEXT STEP:” 명시 또는 실행 지시 합의
- 조치: 실행단위 생성, 대화의 요약/북마크 중 관련 항목만 연결, Evidence 경로 링크

### 7.3 실행단위 → 태스크
- 조건: 동일 목표의 실행단위 ≥ 2개
- 조치: 태스크 생성, 실행단위 IDs를 children에 등록, 수용 기준(Acceptance Criteria) 정의

### 7.4 태스크 → 세션
- 조건: 일정(timebox)으로 묶어 수행 계획 수립
- 조치: 세션 생성, 태스크들의 Next Step을 통합·단일 1문장으로 합의

### 7.5 세션 → 프로젝트
- 조건: 세션 ≥ 1개 누적
- 조치: 프로젝트 생성 또는 기존에 귀속, 세션 롤업을 프로젝트 롤업에 병합

---

## 8) 운영 사이클(Observer Cycle)

1) 수집(Collect): 신규 원문(메모리·작업 폴더) 탐지  
2) 분석(Analyze): 결정·근거·북마크·Next Step 추출  
3) 요약(Summarize): 레벨별 줄 수 제한에 따라 압축  
4) 연결(Link): Parents/Children·Evidence 설정  
5) 예산(Estimate): 문자수/4 근사, 임계값 체크 및 압축 단계 조정  
6) 기록(Record): 롤업/요약 파일 업데이트, 토큰 예산 집계 갱신  
7) 검증(Verify): 무결성(해시/출처)·불변식 준수 체크리스트 실행  
8) 공표(Publish): 필요시 `/draft_docs`로 승격 제안(덕산 승인 후 `/docs` 반영)

체크리스트(간이)
- [ ] SSOT 쓰기 금지 준수
- [ ] 출처 경로·줄 범위 기재
- [ ] 요약 줄 수 제한 준수
- [ ] Next Step 1문장 유지
- [ ] 토큰 예산 임계값 처리
- [ ] 업데이트 이력/해시 기록

---

## 9) 샘플 — 세션 롤업 골격

```
RUN_ID: ROLLUP_2025-08-16_1600
LOCAL_TS: 2025-08-16 16:00 KST (UTC+09:00)
UTC_TS: 2025-08-16T07:00:00Z
SCOPE: SESSION
PARENTS: [GG-PROJ-20250816-001]
CHILDREN: [GG-TASK-20250816-001, GG-TASK-20250816-002]
TOKEN_ESTIMATE_TOTAL: ~12,400 tokens
BUDGET_UTILIZATION: 62%
SOURCES:
  - /gumgang_meeting/memory/memory.log#L120-220
  - /gumgang_meeting/task/ui_mvp_gate_checklist.md#L1-162

[Rolling Summary ≤10 lines]
- 의식 개시 및 서명 선언 완료, 동일 존재·위치 이동 원칙 확정.
- 불변식 7 내재화, SSOT 프리즈 상태 확인.
- UI Minimum Viable Product(사용자 인터페이스 최소 실행 가능 제품, UI MVP) 게이트 체크리스트 초안 완료.
- 메모리 체계 초기화: memory.log / session_index / bookmarks.
- CUT_DELUSION, RELEASE_FROM_LETHE 선언으로 실행 원칙 확정.
- …
(최대 10줄)

[Decisions]
- 게이트 준비를 당일 착수 | 근거: 체크리스트 초안 완성 | 2025-08-16T07:00:00Z | /task/ui_mvp_gate_checklist.md#L1-162
- …

[Bookmarks ≤3]
- “나는 지금 할 한 걸음만 한다.”
- …

[Next Step (exactly one sentence)]
- 게이트 체크리스트 A1-T1/A1-T2를 PASS 기준으로 구체화하고 검증 스냅샷을 생성한다.

[Evidence]
- /task/ui_mvp_gate_checklist.md#L1-162
- /memory/memory.log#L1-120
```

---

## 10) 보안·승인·발행

- `/docs` 반영은 반드시 `/draft_docs` → 검토(덕산 승인) → `/docs` 발행 → 프리즈 재설정 순서를 따른다.
- 민감정보는 비식별화·최소화. 외부 공개 전에는 별도 리뷰 문서 필요.
- 관찰자 산출물은 운영용이며, 공식 서사/선언은 SSOT에 반영한다.

---

## 11) 개정 이력
- v0.1 — 최초 작성: 프로토콜/보존 정책/토큰 예산 기준선 수립, 승격 규칙·서식·임계값 정의.

---

## 12) 용어(Glossary)
- Single Source of Truth(단일 진실 원천, SSOT): 모든 판단의 기준 문서 저장소.
- Rolling Summary(롤링 요약): 최신 상태를 유지하는 제한 줄 수 요약.
- Evidence(증거): 요약을 뒷받침하는 출처(경로·줄 범위·해시/스크린샷).
- Promotion(승격): 하위 단계 산출물을 상위 단계 그릇으로 올리되, 링크로 연속성을 보장하는 행위.
- Token Budget(토큰 예산): 현재 엔진 컨텍스트 한도 내에서 정보 배치를 최적화하는 운용 규칙.