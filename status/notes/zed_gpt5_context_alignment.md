---
phase: past
---

# Zed × GPT‑5 컨텍스트 정렬(Alignment) 노트
- Doc: status/notes/zed_gpt5_context_alignment.md
- 목적: Zed에서 GPT‑5 엔진을 사용할 때 컨텍스트 윈도우 집계/경고가 정확히 동작하도록 설정·검증하는 절차와, 금강 UI의 토크나이저 보드가 이를 어떻게 매핑하는지 기록
- 상태: Active/Confirmed — 운영 컨텍스트 창 272k 확정

## TL;DR
- Zed의 컨텍스트 경고는 “모델의 max_tokens(컨텍스트 윈도우)” 값이 설정돼 있어야 작동한다.
- GPT‑5는 Zed 기본 프리셋에 항상 포함되어 있지 않으므로 settings.json에 커스텀 모델 항목으로 `max_tokens`를 명시한다.
- 금강 UI 보드(A3)는 `model_table.json`의 `context_window`와 임계치(warn 85%, error 95%)를 사용해 시각 경고를 제공한다. `needs_verification: true` 모델은 “[unverified]” 태그와 주석이 자동 표기된다.

---

## 1) Zed에서 GPT‑5 컨텍스트 경고 활성화

Zed 문서 근거
- Agent Panel > Token Usage: 모델 컨텍스트에 근접하면 요약/새 스레드 제안 배너가 뜬다.
- Text Threads: 타이핑 중 “남은 토큰 수”가 실시간 갱신된다.
- LLM Providers > OpenAI(Custom Models): 커스텀 모델의 `max_tokens`를 지정해야 컨텍스트 계산이 정확해진다.

설정 절차
1. Zed에서 Command Palette 열기 → “agent: open settings”
2. OpenAI 섹션의 “Available Models”에 GPT‑5를 명시
   - OpenAI 최신 문서 기준으로 본 문서는 보수 운영값을 확정한다.
     - 확정 운영값(컨텍스트 윈도우): 272000
3. settings.json 예시(보수 기준)
   {
     "language_models": {
       "openai": {
         "available_models": [
           {
             "name": "gpt-5",
             "display_name": "gpt-5 (272k)",
             "max_tokens": 272000,
             "max_completion_tokens": 20000,
             "reasoning_effort": "high"
           }
         ]
       }
     }
   }
4. settings.json 예시(확장 기준)
   {
     "language_models": {
       "openai": {
         "available_models": [
           {
             "name": "gpt-5",
             "display_name": "gpt-5 (400k)",
             "max_tokens": 400000,
             "max_completion_tokens": 20000
           }
         ]
       }
     }
   }
5. OpenAI 호환 엔드포인트(예: OpenRouter/프록시) 사용 시
   - 해당 프로바이더 블록에 `api_url`과 `available_models[].name`, `max_tokens`를 함께 지정해야 동일하게 경고가 동작한다.

검증 포인트
- Agent Panel 툴바에 토큰 사용량이 표시됨
- 컨텍스트가 한계 근처에 도달하면 입력창 아래 요약/새 스레드 배너가 자동 표출
- Text Threads에서는 타이핑 중 “남은 토큰 수”가 실시간 갱신

운영 팁
- 실시간 잔여 토큰이 꼭 필요하면 Text Thread로 작업
- 긴 흐름은 “New From Summary”로 갈라서 한 스레드 컨텍스트를 억제

---

## 2) 금강 UI 보드(A3)와 Zed 경고의 매핑

금강 UI 구현 요점
- 파일:
  - ui/tools/tokenizer/model_table.json
  - ui/tools/tokenizer/estimator.js
- 동작:
  - 보드는 모델의 `context_window`를 사용해 Max/Current/Headroom/Status(OK/WARN/ERROR) 계산
  - 임계치: warn 85%, error 95% (model_table.json의 `ui_thresholds`로 조정 가능)
  - `needs_verification: true` 모델은 표시명에 “ [unverified]”를 자동 덧붙이고, 노트에 “모델 파라미터 미확인”을 표기하도록 반영됨

필드 매핑
- Zed settings.json `max_tokens` ↔ 금강 `model_table.json.context_window`
- Zed 경고 배너 임계(내부 로직) ↔ 금강 UI WARN/ERROR 임계(85%/95%)
- Zed 모델 선택기 ↔ 금강 A3 Model 드롭다운
- Zed 실시간 토큰(텍스트 스레드) ↔ 금강 오프라인 휴리스틱 추정(T0, CPT 기반)

주의
- 금강 보드는 휴리스틱 추정(T0)로 실제 토크나이저와 1:1 일치 보장 없음. “상대적 규모/상태” 확인 목적.
- `model_table.json`에 gpt‑5는 현재 `needs_verification: true`로 표기되어 있으며, 실제 문서 확정 시 `context_window`/노트를 업데이트해야 함.

---

## 3) 합의된 운영 값(초기)
- 금강 UI 기본: gpt‑5가 존재하면 기본 모델로 선택, 없으면 gpt‑4o(128k)
- 확정 운영값:
  - 272k 보수 모드: Zed `max_tokens=272000`, 금강 `context_window=272000`
  - 400k 확장 예시는 참고용(legacy)으로 보관
- `max_completion_tokens`(출력 한도)는 Zed에서 과금/지연 보호를 위해 20k로 상한 제어(운영 환경에서 조정)

---

## 4) 단계별 점검 체크리스트

A. 환경 준비
- [ ] Zed 최신 버전
- [ ] OpenAI API Key(또는 호환 엔드포인트 키) 등록

B. 설정
- [ ] settings.json에 gpt‑5 커스텀 모델 추가, `max_tokens` 명시
- [ ] (호환) `api_url`/`name`/`max_tokens` 일치 확인

C. Zed 동작 확인
- [ ] Agent Panel에서 gpt‑5 선택 가능
- [ ] 토큰 사용량 표시 확인
- [ ] 한계 근접 시 요약/새 스레드 배너 노출

D. 금강 UI 보드 확인
- [ ] A3에서 gpt‑5 기본 선택됨
- [ ] “[unverified]” 태그 및 노트 표기 확인
- [ ] 길이 증가 시 WARN(85%) → ERROR(95%)로 상태 전이
- [ ] Headroom/Current 값 갱신

E. 문서 정합
- [ ] OpenAI 공식 모델 페이지로 `context_window`/출력 한도 재확인
- [ ] `model_table.json`과 Zed settings.json의 수치를 동일하게 업데이트

---

## 5) 알려진 한계와 운영 가이드
- 금강 추정기는 문자 분포(CPT) 휴리스틱이라 이모지/특수 스크립트에서 오차 가능
- 실사용 임계 관리는 Zed 경고와 병행: UI 보드는 조기 감지/대략치, 실제 차단/요약은 Zed가 주도
- 컨텍스트가 커지는 장시간 작업은 “작업 단위별 새 스레드” 전략 권장

---

## 6) 변경 이력
- 2025‑08‑17
  - 최초 작성
  - estimator.js: needs_verification 모델에 “[unverified]” 태그 및 노트 경고 추가
  - 본 문서에 Zed 설정 스니펫(272k/400k)와 매핑 규칙 명시