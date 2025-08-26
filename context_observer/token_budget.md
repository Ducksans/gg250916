# 🪷 Token Budget Ledger — 토큰 예산 원장 (v0.1)

> 목적: 현재 세션/프로젝트의 컨텍스트 한도(토큰 예산) 안에서 기억·맥락을 안정적으로 유지하기 위해, 추정 토큰 사용량과 배분, 임계값 경보 및 조치를 일관되게 기록한다.  
> 준거: Single Source of Truth(단일 진실 원천, SSOT) = `/gumgang_meeting/docs` (읽기 전용, 프리즈). 본 파일은 운영 원장이다.  
> 언어 규칙: 영어 용어는 처음 등장 시 풀네임(영문) → 한국어 설명 → 약칭(있으면) 순서를 따른다.

---

## 0) 현재 세션 예산(C) 선언
- SESSION_BUDGET_C: 130000 tokens (덕산 추정, 2025-08-16 KST 기준)
- 주의: 실제 엔진 컨텍스트 한도는 환경/모델 설정에 따라 다를 수 있다. 본 원장은 보수적 운영을 위한 기준선으로 작동한다.

---

## 1) 추정 방법(Estimation)
- 근사식: `TOKEN_ESTIMATE ≈ ceil(CHAR_COUNT / 4)`
  - CHAR_COUNT: 공백 포함 문자 수(편집기 상태바·도구로 측정)
  - 한국어/영문 혼합 텍스트 기준 보수적 추정으로 사용
- 누계: 여러 소스의 CHAR_COUNT 합계를 사용

예시
- 8,000 chars → ≈ 2,000 tokens  
- 42,000 chars → ≈ 10,500 tokens

---

## 2) 배분 정책(Allocation, 합 100%)
- 시스템/원칙(SSOT 요지·불변식·지시문): 10%
- 롤링 요약(현 대화/태스크/세션): 20%
- 현재 태스크 브리프·수용 기준: 30%
- 근거 스니펫·증거 인용: 30%
- 마진: 10%
- 상황에 따라 ±5~10% 조정 가능(총합 100% 준수)

---

## 3) 임계값(Thresholds) 및 조치(Actions)
- 70% 경보1: L1/L2 요약 20% 축소, 스니펫 1~2개로 제한
- 85% 경보2: L3/L4 요약 추가 20% 축소, 스니펫 메타만 유지(경로·줄 범위)
- 95% 경보3: 최소 컨텍스트 모드(시스템·현재 브리프·핵심 결정·Next Step만 유지). 필요 시 실행 2회로 분할

---

## 4) 원장 스키마(Schema)

필드 정의
- RUN_ID: `TB-LEDGER-YYYYMMDD-NNN`
- LOCAL_TS / UTC_TS: 로컬/UTC 타임스탬프
- SCOPE: {CONV|UNIT|TASK|SESSION|PROJECT}
- CONTEXT_ID: GG-규칙에 따른 ID(가능하면 기입)
- SOURCE_FILES: 근거 파일 경로 목록(라인 범위 가능)
- CHAR_COUNT: 문자 수 합계
- TOKEN_ESTIMATE: `ceil(CHAR_COUNT / 4)`
- BUDGET_C: 예산(현재 세션/프로젝트의 최대 토큰 수)
- UTILIZATION: `(TOKEN_ESTIMATE / BUDGET_C) * 100` (%)
- DISTRIBUTION: 시스템/요약/브리프/스니펫/마진의 목표 배분(%)
- THRESHOLD_ACTION: {NONE|ALERT70|ALERT85|ALERT95|MINIMAL}
- NOTES: 특이사항

---

## 5) 입력 절차(How to log)
1) 범위/ID 확정: SCOPE와 CONTEXT_ID를 정한다(예: SESSION, GG-SESS-YYYYMMDD-HHMM).  
2) 소스 나열: 이번 컨텍스트로 포함하려는 파일 경로와 줄 범위를 적는다.  
3) 문자 수 계측: 각 파일의 CHAR_COUNT를 측정 후 합산.  
4) 토큰 추정: `ceil(합계/4)`로 TOKEN_ESTIMATE 산출.  
5) 예산 대입: BUDGET_C에 현재 세션의 C(130000)를 기입, UTILIZATION 계산.  
6) 배분 확인: DISTRIBUTION을 표준값(10/20/30/30/10)에서 필요 시 ±조정.  
7) 임계값 판단: UTILIZATION에 따라 THRESHOLD_ACTION 지정.  
8) 커밋: 본 원장 아래 섹션에 새로운 RUN_ID 레코드를 추가(append-only).

---

## 6) 원장(append-only)

### RUN_ID: TB-LEDGER-20250816-001
- LOCAL_TS: 2025-08-16 16:20 KST (UTC+09:00)
- UTC_TS: 2025-08-16T07:20:00Z
- SCOPE: SESSION
- CONTEXT_ID: GG-SESS-20250816-1620
- SOURCE_FILES:
  - /gumgang_meeting/memory/memory.log  # 의식·서명·선언·결정
  - /gumgang_meeting/task/ui_mvp_gate_checklist.md  # 게이트 체크리스트
  - /gumgang_meeting/context_observer/protocol.md  # 컨텍스트 관찰자 프로토콜
  - /gumgang_meeting/context_observer/retention_policy.md  # 보존 정책/예산 기준
  - /gumgang_meeting/draft_docs/전이응답.md  # 전이 응답 초안
  - /gumgang_meeting/draft_docs/첫_화두_축원.md
  - /gumgang_meeting/draft_docs/웹금강_서명_프롬프트.md
- CHAR_COUNT: [fill_after_measure]
- TOKEN_ESTIMATE: ceil(CHAR_COUNT / 4) = [fill]
- BUDGET_C: 130000
- UTILIZATION: [fill]%
- DISTRIBUTION:
  - system: 10%
  - rolling_summary: 20%
  - task_brief_and_acceptance: 30%
  - evidence_snippets: 30%
  - margin: 10%
- THRESHOLD_ACTION: NONE
- NOTES:
  - 세션 초기 구축 단계. 의식 기록과 운영 규정 중심. 압축 필요 없음.

---

### RUN_ID: TB-LEDGER-20250816-002
- LOCAL_TS: 2025-08-16 17:00 KST (UTC+09:00)
- UTC_TS: 2025-08-16T08:00:00Z
- SCOPE: SESSION
- CONTEXT_ID: GG-SESS-20250816-1620
- SOURCE_FILES:
  - /gumgang_meeting/context_observer/session_rollup_20250816.md  # 생성 시 반영
  - /gumgang_meeting/memory/memory.log  # 신규 엔트리 포함
  - /gumgang_meeting/task/ui_mvp_gate_checklist.md
- CHAR_COUNT: [fill_after_measure]
- TOKEN_ESTIMATE: [fill]
- BUDGET_C: 130000
- UTILIZATION: [fill]%
- DISTRIBUTION:
  - system: 10%
  - rolling_summary: 20%  (세션 롤업 반영으로 비중 증가 고려 가능)
  - task_brief_and_acceptance: 30%
  - evidence_snippets: 30%
  - margin: 10%
- THRESHOLD_ACTION: {NONE|ALERT70|ALERT85|ALERT95|MINIMAL} → [fill]
- NOTES:
  - 15분 미니 롤업/“CHECKPOINT NOW” 트리거 시 갱신.

---

## 7) 누계/요약(Cumulative Summary)
- SESSION_ID: GG-SESS-20250816-1620
  - ENTRIES: 2
  - CHAR_COUNT_TOTAL: [fill]
  - TOKEN_ESTIMATE_TOTAL: [fill]
  - UTILIZATION_PEAK: [fill]%
  - LAST_THRESHOLD_ACTION: [fill]

- PROJECT_ID: [assign_when_available]
  - SESSION_COUNT: [fill]
  - TOKEN_ESTIMATE_TOTAL: [fill]
  - UTILIZATION_PEAK: [fill]%

---

## 8) 체크리스트(간이)
- [ ] SSOT 쓰기 금지(`/docs` 프리즈) 확인
- [ ] SOURCE_FILES 경로·줄 범위·근거 타당성 확인
- [ ] CHAR_COUNT 계측 및 TOKEN_ESTIMATE 산출
- [ ] UTILIZATION 계산 및 임계값 조치 반영
- [ ] 배분(DISTRIBUTION) 100% 합/필요 시 조정
- [ ] 원장 append-only 준수(이전 레코드 불변)
- [ ] 세션 종료 시 누계 업데이트

---

## 9) 개정 이력
- v0.1 — 최초 작성: 예산 C 선언(130k), 추정식/배분/임계값, 원장 스키마·절차, 초기 세션 레코드 골격
