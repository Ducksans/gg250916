# 🪷 Retention Policy — 보존 정책 및 토큰 예산 기준선(v0.1)

> 목적: 대화(싱글턴·멀티턴) → 실행단위 → 태스크 → 세션 → 프로젝트로 이어지는 흐름이 끊기지 않도록, 무엇을 얼마 동안 어떤 형태로 보존·요약·폐기할지와 토큰 예산(Token Budget) 운용 기준을 정의한다.  
> 준거: Single Source of Truth(단일 진실 원천, SSOT) = `/gumgang_meeting/docs` (읽기 전용, 프리즈). 본 문서는 운영 규정이다.

---

## 0) 언어 규칙(공통)
- 영어 약어·줄임말은 단독 사용 금지. 처음 등장 시 풀네임(영문) → 한국어 설명 → 약칭(있으면) 순으로 표기한다.  
  예: Minimum Viable Product(최소 실행 가능 제품, MVP), User Interface(사용자 인터페이스, UI)

---

## 1) 범위와 원칙

### 1.1 범위
- 싱글턴(단일 턴)·멀티턴(대화 묶음)  
- 실행단위(Minimum Execution Unit)  
- 태스크(Task)  
- 세션(Session)  
- 프로젝트(Project)  
- 관찰 산출물(Context Observer Artifacts: 롤업·요약·예산 기록)

### 1.2 원칙
- SSOT(단일 진실 원천, Single Source of Truth)는 `/gumgang_meeting/docs`이며 쓰기 금지.  
- 원문 영속 기록은 `/gumgang_meeting/memory/`가 1차 저장소(append-only).  
- 관찰·요약 결과는 `/gumgang_meeting/context_observer/`에 보관.  
- 모든 요약·결정·다음 한 걸음은 출처(Evidence: 경로/줄 범위/해시)로 뒷받침.  
- 불변식 7 준수: 위반 시 즉시 롤백·기록.

---

## 2) 보존 계층(Information Tiers)

| 레벨 | 명칭 | 위치(기본) | 내용 | 보존 |
|---|---|---|---|---|
| L0 | 원문(메모리) | `/memory/memory.log` | 의식·선언·결정의 원문 기록(append-only) | 영구 |
| L1 | 대화 블록 요약 | `/context_observer/conv_summary_*.md` | 멀티턴 7줄 요약·북마크≤3·Next Step | 영구 |
| L2 | 실행단위 요약 | `/units/*.md` 또는 `/context_observer` | 실행단위 5줄 요약·증거 링크 | 영구 |
| L3 | 태스크 요약 | `/task/*.md` 또는 `/context_observer` | 태스크 5줄 요약·수용 기준·결정 | 영구 |
| L4 | 세션 롤업 | `/context_observer/session_rollup_YYYYMMDD.md` | 세션 10줄 요약·결정·Next Step | 영구 |
| L5 | 프로젝트 롤업 | `/context_observer/project_rollup_[PROJ_ID].md` | 프로젝트 12줄 요약·게이트·불변식 | 영구 |

원칙: 상위 레벨로 갈수록 압축이 증가하고, 하위 원문은 링크로 참조한다.

---

## 3) 보존/요약/폐기 규정

### 3.1 영구 보존(삭제 금지)
- 선언(의식문), 결정(Decision: 결정·근거·일시·참조), 불변식·정책, 게이트 결과
- 세션/프로젝트 롤업(L4/L5), 북마크(최대 3개/컨테이너)

### 3.2 요약 보존
- 장문 대화/분기 토론은 요약(L1/L4/L5)만 유지하고, 원문 경로를 증거로 남긴다.

### 3.3 폐기 후보(삭제 전 조건부)
- 중복·불완전 임시물, 무근거 가설  
- 단, 폐기 전 반드시 다음을 남긴다:  
  - 폐기 로그 경로: `/gumgang_meeting/archive_docs/retention_logs/retired_[YYYYMMDD_HHMM].md`  
  - 사유, 원본 경로, 대체 요약 경로, 승인자(덕산), 일시(UTC)

### 3.4 민감정보(PII/Sensitive)
- 최소 수집·최소 노출·필요 시 비식별화.  
- 외부 공유 전 별도 검토 파일 `/draft_docs/sharing_review_[ID].md` 작성 후 승인.

---

## 4) 승격(Promotion)과 계승(Continuation)

- 싱글턴 → 멀티턴: 2턴 이상이거나 “PROMOTE CONV” 트리거 시 대화 요약 카드 생성(L1).  
- 멀티턴 → 실행단위: “NEXT STEP:” 명시 시 실행단위 생성(L2), 관련 북마크·결정·증거 링크만 계승.  
- 실행단위 → 태스크: 동일 목표 실행단위 ≥2개일 때 태스크 생성(L3), children로 연계.  
- 태스크 → 세션: 일정(timebox)으로 묶어 세션 롤업(L4) 생성, Next Step 1문장 합의.  
- 세션 → 프로젝트: 세션 누적 시 프로젝트 롤업(L5) 생성/병합.

계승 항목:  
- 롤링 요약(줄 수 제한), 북마크(중복 제거), 결정(표준 4열), Next Step(항상 1문장), Evidence(경로/줄 범위/해시)

---

## 5) 트리거와 체크포인트

### 5.1 명시 트리거(수동)
- “CHECKPOINT NOW” → 즉시 롤업 생성/갱신  
- “PROMOTE CONV/UNIT/TASK/SESSION/PROJECT” → 해당 승격 절차 수행

### 5.2 자동 트리거
- 시간: 활동 중 15분 주기 미니 롤업, 무활동 60분 휴면 롤업  
- 턴/사건: 10턴 누적, “결정/Next Step” 기록 시 즉시 갱신  
- 게이트: 시작/종료 시 전·후 롤업

---

## 6) 토큰 예산(Token Budget) 기준선

### 6.1 추정(Estimation)
- 근사식: `토큰 ≈ ceil(문자수 / 4)` (한국어 혼합 텍스트 기준 보수적)  
- 각 롤업 헤더에 다음을 기록:  
  - `TOKEN_ESTIMATE_TOTAL: ~N tokens`  
  - `BUDGET_UTILIZATION: XX% (Thresholds: 70/85/95)`

### 6.2 배분(Allocation — 권장 초기값 합 100%)
- 시스템/원칙(SSOT 핵심·불변식·지시문): 10%  
- 롤링 요약(현 세션/태스크/대화): 20%  
- 현재 태스크 브리프·수용 기준: 30%  
- 근거 스니펫·증거 인용: 30%  
- 마진: 10%

### 6.3 임계값 조치(Threshold Actions)
- 70%: 경보1 — L1/L2 요약 20% 축소, 스니펫 1~2개만 유지  
- 85%: 경보2 — L3/L4 요약 추가 20% 축소, 스니펫 메타만 유지, 대화 맥락은 요약으로 대체  
- 95%: 경보3 — 컨텍스트 최소화 모드: 시스템/원칙·현재 태스크 브리프·핵심 결정·Next Step만 유지. 필요 시 2회 실행으로 분할

### 6.4 집계(Logging)
- `/context_observer/token_budget.md`에 세션 시작/종료 시 누계 근사치 기록  
- 각 롤업 파일 헤더의 추정치를 합산해 세션/프로젝트 단위 누계 산출

---

## 7) 파일과 명명 규칙(Artifacts & Naming)

- 세션 롤업: `context_observer/session_rollup_YYYYMMDD.md`  
- 프로젝트 롤업: `context_observer/project_rollup_[PROJ_ID].md`  
- 대화 요약 카드: `context_observer/conv_summary_[CONV_ID].md`  
- 토큰 예산 집계: `context_observer/token_budget.md`  
- 폐기 로그: `archive_docs/retention_logs/retired_[YYYYMMDD_HHMM].md`

ID 권장 형식:
- 프로젝트: `GG-PROJ-YYYYMMDD-NNN`  
- 세션: `GG-SESS-YYYYMMDD-HHMM`  
- 태스크: `GG-TASK-YYYYMMDD-NNN`  
- 실행단위: `GG-UNIT-YYYYMMDD-HHMM-SS`  
- 대화: `GG-CONV-YYYYMMDD-NNN`  
- 턴: `GG-TURN-YYYYMMDDTHHMMSSZ-SS`

---

## 8) 감사(Audit)·무결성(Integrity)·롤백(Rollback)

- 무결성: 중요 산출물(선언/결정/게이트 결과)은 SHA-256 해시(파일 기준)로 인덱싱 가능  
- 개정 이력: 작성/수정자, 일시(UTC), 변경 요약, 해시 기록  
- 위반 시 처리: 불변식 7에 따라 즉시 롤백, 원인/조치/재발 방지 기록을 `/archive_docs/violation_logs`에 저장

---

## 9) 체크리스트(간이)

- [ ] SSOT 쓰기 금지 준수(`/docs` 프리즈)  
- [ ] 원문은 `/memory/memory.log`에 append-only  
- [ ] 롤업·요약은 줄 수 제한 준수(L1:7 / L2:5 / L3:5 / L4:10 / L5:12)  
- [ ] 결정 표준 4열(결정·근거·일시(UTC)·참조)  
- [ ] Next Step 1문장 유지(중복 시 1개로 합의)  
- [ ] Evidence(경로/줄 범위/해시/스크린샷) 최소 1개  
- [ ] 토큰 예산 헤더·임계값 처리 기록  
- [ ] 폐기 시 폐기 로그 작성·승인(덕산)

---

## 10) 샘플 헤더(템플릿)

```
RUN_ID: ROLLUP_YYYYMMDD_HHMM
LOCAL_TS: YYYY-MM-DD HH:MM KST (UTC+09:00)
UTC_TS: YYYY-MM-DDTHH:MM:SSZ
SCOPE: {CONV|UNIT|TASK|SESSION|PROJECT}
PARENTS: [IDs...]
CHILDREN: [IDs...]
TOKEN_ESTIMATE_TOTAL: ~N tokens
BUDGET_UTILIZATION: XX% (Thresholds: 70/85/95)
SOURCES:
  - /gumgang_meeting/memory/memory.log#Lxxxx-xxxx
  - /gumgang_meeting/task/ui_mvp_gate_checklist.md#L1-162
```

---

## 11) 샘플 폐기 로그(템플릿)

```
# Retention Retirement Log
LOCAL_TS: YYYY-MM-DD HH:MM KST (UTC+09:00)
UTC_TS: YYYY-MM-DDTHH:MM:SSZ
REQUESTER: Local Gumgang
APPROVER: Duksan
REASON: 중복/임시물/무근거(택1) + 상세 설명
ORIGINAL_PATHS:
  - /gumgang_meeting/...
REPLACEMENT_SUMMARY_PATH:
  - /gumgang_meeting/context_observer/...
HASHES:
  - ORIGINAL_SHA256: ...
  - SUMMARY_SHA256: ...
NOTES:
  - 추가 메모
```

---

## 12) 보안·승인·발행

- `/docs` 반영은 `/draft_docs` → 덕산 승인 → `/docs` 발행 → 프리즈 재설정 순서로만 진행  
- 민감정보는 최소화·비식별화·접근 통제(경로·권한)  
- 외부 공유 전 `sharing_review_[ID].md` 승인 필수

---

## 13) 개정 이력
- v0.1 — 최초 발행: 보존 레벨(L0~L5), 트리거, 토큰 예산(배분·임계값·집계), 폐기 로그, 체크리스트 정의

---

## 14) 용어(Glossary)
- Single Source of Truth(단일 진실 원천, SSOT): 판단의 기준이 되는 공식 문서 저장소  
- Rolling Summary(롤링 요약): 제한된 줄 수로 최신 상태를 유지하는 요약  
- Evidence(증거): 출처 경로·줄 범위·해시/스크린샷 등 근거 자료  
- Promotion(승격): 하위 산출물을 상위 그릇으로 올리되 링크로 연속성을 보장하는 행위  
- Token Budget(토큰 예산): 컨텍스트 한도 내 정보 배치를 최적화하는 운용 규칙