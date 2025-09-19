---
phase: past
---

# 금강 UI — Phase 2 토크나이저 T0 PASS 증거
- Doc: ui_tokenizer_phase2_t0_pass_20250817.md
- Scope: Phase 2 착수(Tokenizer Board, Offline Estimator T0) — A3 패널 연동 및 1차 동작 검증
- Status: PASS
- Date (Local KST): 2025-08-17
- Related CHECKPOINT: GG-TR-0024 | CHECKPOINT (PHASE_2_KICKOFF)
- Session: GG-SESS-20250816-2249 (연속 흐름 유지)
- Method: Chrome DevTools — Elements 탭에서 section#a3 노드 선택 → "Capture node screenshot"로 저장
- Exclusions: 이모지 전용/매우 짧은 입력 테스트는 실제 사용 발현 빈도가 매우 낮아 본 증거 범위에서 제외

---

## 1) 개요
Phase 2의 첫 작업으로 “토크나이저 보드(Tokenizer Board)”를 A3 패널에 연동하고, 오프라인 추정기(T0, heuristic)로 토큰 길이 측정이 가능한 최소 기능을 제공했다. 본 증거 문서는 기능 구현 범위, 테스트 절차, 결과, 스크린샷(플레이스홀더) 및 다음 단계 제안을 기록한다.

---

## 2) 구현 개요
- 신규/변경 아티팩트
  - 신규: `ui/tools/tokenizer/model_table.json`
    - 인코딩: `cl100k_base`, `o200k_base`, `llama3_sp`, `sentencepiece_kr`
    - 대표 모델 엔트리: `openai/gpt-3.5-turbo-0125`, `openai/gpt-4o-2024-05-13`, `openai/gpt-4o-mini-2024-07-18`, `meta/llama-3.1-8b-instruct`
    - UI 임계치: warn 85%, error 95%
  - 신규: `ui/tools/tokenizer/estimator.js`
    - 오프라인 T0 계측기(의존성 0)
    - 한글/ASCII/기타 문자 분포 기반 간이 토큰 추정(encoding별 CPT 사용)
    - 보드 UI 렌더 `renderBoard(container, opts)` 제공
  - 변경(A3 확장): `ui/snapshots/unified_A1-A4_v0/index.html`
    - A3 패널에 입력 textarea와 보드 컨테이너 추가
    - `estimator.js`/`model_table.json` 로드 및 초기화

- 동작 개념
  - 입력 텍스트를 `estimateTokens`로 추정 → `computeStats`로 Max/Current/Headroom/Status 계산 → 보드에 표시
  - 모델 기본값: `openai/gpt-4o-2024-05-13` (o200k_base, Max 128k)
  - 임계치 기반 상태 표시: OK / WARN (>=85%) / ERROR (>=95%)

---

## 3) 테스트 시나리오 및 절차
- 환경
  - 파일: `ui/snapshots/unified_A1-A4_v0/index.html#a3` (로컬 파일 오픈)
  - 패널: A3 — 도구 패널
  - 브라우저: Chromium 계열 기준(데브툴 열림 무관)

- 공통 확인 포인트
  1. Tokenizer 행: “Heuristic estimator (T0) — offline” 문구 노출
  2. Input textarea에 텍스트 입력 → “측정 (Measure)” 버튼 클릭 시 보드 값 업데이트
  3. Model / Encoding / Max / Current / Headroom / Status 필드가 즉시 반영
  4. 하단 노트 영역에 CPT(en/ko) 및 ascii/hangul/other 분포가 표시

- 케이스
  - T1: 한글만 입력
    - 입력: 예) “체크토큰”을 반복하여 충분 길이로 구성
    - 기대: 한글 비중 높게 탐지, CPT(ko) 기반 추정, Status 라벨 정상 산출
    - 판정: PASS
  - T2: 영어만 입력
    - 입력: 예) “checktoken” 반복
    - 기대: ASCII 비중 높게 탐지, CPT(en) 기반 추정, Status 라벨 정상 산출
    - 판정: PASS
  - T3: 한글+영어 혼합 입력
    - 입력: 예) “checktoken 체크토큰” 혼합 반복
    - 기대: 혼합 분포로 추정, Status 라벨 정상 산출
    - 판정: PASS
  - T4: 경계값 확인(임계치)
    - 입력 길이를 점증시켜 WARN(>=85%) → ERROR(>=95%) 상태 전이 확인
    - 기대: Status 라벨 및 퍼센트 표기가 단계적으로 변경
    - 판정: PASS

- 부가 확인
  - A1/A2/A4 탭 이동 후 복귀해도 A3 보드가 정상 표시 유지
  - 테마 토글(Dark/Light) 상태에서 보드 가독성 유지

---

## 4) 테스트 결과 요약
- 한글만 세어보기: PASS
- 영어만 세어보기: PASS
- 한글+영어 혼합 세어보기: PASS
- 상태 값 리포트(Status 라벨/퍼센트/Headroom): PASS
- 임계치 경계(WARN/ERROR 전이): PASS
- UI 일관성(탭, 테마, 레이아웃): PASS

주의: 본 추정기는 T0(heuristic)로서 실제 토크나이저와 1:1 일치하지 않을 수 있음(의도된 설계). Phase 2 초기에는 “상대적 규모/상태” 파악이 목적.

---

## 5) 스크린샷
- 저장 경로(신규 디렉터리): `ui/logs/tokenizer/screenshots/`
- 파일명 규칙(예시):
  - `TK_ko_only_pass_20250817_1420.png` — 한글 전용 입력 PASS
  - `TK_en_only_pass_20250817_1421.png` — 영어 전용 입력 PASS
  - `TK_mixed_pass_20250817_1422.png` — 혼합 입력 PASS
  - `TK_threshold_warn_20250817_1423.png` — WARN 경계 확인
  - `TK_threshold_error_20250817_1424.png` — ERROR 경계 확인

- 첨부:
  - ui/logs/tokenizer/screenshots/TK_ko_only_pass_20250817_1432.png
  - ui/logs/tokenizer/screenshots/TK_en_only_pass_20250817_1439.png
  - ui/logs/tokenizer/screenshots/TK_mixed_pass_20250817_1439.png
  - ui/logs/tokenizer/screenshots/TK_threshold_warn_20250817_1439.png
  - ui/logs/tokenizer/screenshots/TK_threshold_error_20250817_1439.png

캡처 방법(실시):
- Chrome DevTools → Elements(요소) → section#a3 선택 → “Capture node screenshot”
- 각 케이스 입력 후 “측정(Measure)” 클릭 → 상태가 반영된 시점에서 캡처 저장
- 저장 경로: /home/duksan/바탕화면/gumgang_meeting/ui/logs/tokenizer/screenshots

캡처 가이드:
- A3 패널이 전부 보이도록 스크롤 조정 후 전체 패널 영역 캡처
- 상단 Model/Encoding/Max/Current/Headroom/Status 및 하단 노트 모두 포함

---

## 6) 재현 절차(간단)
1. 파일 열기: `ui/snapshots/unified_A1-A4_v0/index.html#a3`
2. A3 — 도구 패널로 이동
3. Input에 텍스트 입력(한글/영문/혼합)
4. “측정 (Measure)” 클릭
5. 보드 필드와 상태 라벨 확인
6. 길이를 늘려 WARN/ERROR 경계 상태 전이 확인
7. 스크린샷을 `ui/logs/tokenizer/screenshots/`로 저장

---

## 7) 수용 기준(AC) 대조
- AC-1: A3에서 토크나이저 보드가 렌더링되고 주요 필드를 표시한다 — PASS
- AC-2: 사용자가 입력한 텍스트를 기반으로 Current/Headroom/Status가 계산되어 반영된다 — PASS
- AC-3: 한글/영문/혼합 케이스에서 일관된 동작을 보인다 — PASS
- AC-4: 임계치 기반 WARN/ERROR 상태 전이가 시각적으로 구분된다 — PASS
- AC-5: 로컬 오프라인 환경에서 동작한다(의존성 0) — PASS

---

## 8) 한계 및 노트
- 본 단계는 T0(heuristic)로, 실제 토크나이저의 세부 BPE/SP 규칙과 다를 수 있음
- KO/EN 비중 추정은 간단한 문자 분포 기반 → 문자 집합 다양성(예: 이모지, 한자, 기타 스크립트)에서 오차 가능
- 향후 T1에서 모델/인코딩 셀렉터, 로그 적재, 임계치 사용자 설정, 고급 통계 추가 예정

---

## 9.1) 제외 항목(Exclusions)
- 이모지 전용 입력
- 매우 짧은 입력(실사용 발현 매우 낮음 — 본 증거에서 생략)

## 9) Next
- UI:
  - 모델/인코딩 선택 드롭다운 추가
  - 측정 결과 로그(A4)와 연동
- Estimator(T1+):
  - CPT 계수/가중치 보정 옵션 노출
  - 프롬프트/콘텐츠 분리 계측, 멀티 섹션 합산, 아티팩트별 계측
- 통합:
  - 실제 토크나이저(예: tiktoken/llama sp 등)와의 온라인/오프라인 하이브리드 전략 설계
  - 프로젝트별 모델 테이블 확장/검증 루틴

---

## 10) 결론
- Phase 2 착수(T0) 범위 내 핵심 동작은 PASS.
- 스크린샷 저장 후, GG-TR-0025 CHECKPOINT로 롤업 예정.

Signed-off: Duksan, Local Gumgang