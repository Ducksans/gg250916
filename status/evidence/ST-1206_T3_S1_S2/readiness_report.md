# ST-1206 T3 S1/S2 Readiness Report

## 작업 완료 상태
- **시간**: 2025-08-25 21:00 UTC
- **작업자**: Claude (인수받음)
- **이전 작업자**: GPT-5 (부분 완료 후 인계)

## 구현된 수정사항

### 1. ensureComposerWrap 함수 강화
- **위치**: `ui/overlays/active.js#L16-L100`
- **개선사항**:
  - 함수를 파일 상단으로 이동하여 초기화 우선순위 보장
  - display:contents 적용으로 grid 레이아웃 영향 최소화
  - composer 관련 모든 요소를 wrapper로 수집
  - anchor-result가 composer에 있으면 chat-msgs로 재배치

### 2. ensureSimpleGrid 함수 개선
- **위치**: `ui/overlays/active.js#L103-L240`
- **개선사항**:
  - grid-auto-rows: 0 설정으로 암묵적 row 방지
  - 직계 자식 정리 로직 추가
  - 보조 요소들(anchor-result, consent-bar, a1-usage)을 chat-msgs로 이동
  - 허용되지 않은 직계 자식 자동 이동

### 3. 초기화 순서 정리
- **위치**: `ui/overlays/active.js#L311-L329`
- **개선사항**:
  - initializeUIGuardrails 함수로 초기화 순서 통합
  - 실행 순서: ensureComposerWrap → ensureSimpleGrid → reparentA1ChildrenIfEmpty
  - DOMContentLoaded와 load 이벤트에서 일관된 순서 보장

### 4. 런타임 센서 개선
- **위치**: `ui/overlays/active.js#L331-L450`
- **개선사항**:
  - 상세한 진단 정보 제공
  - 각 테스트별 pass/fail 상태 추적
  - grid template rows 값 분석 및 카운트
  - 직계 자식 정보 수집

## 테스트 도구 준비

### 1. 포괄적 테스트 스위트
- **파일**: `ui/overlays/test_guardrails.js`
- **기능**:
  - 10개 개별 테스트 케이스
  - Simple 모드 감지
  - 상세한 진단 정보
  - 결과 요약 및 저장

### 2. DEV 콘솔 검증 스니펫
- **파일**: `ui/overlays/DEV_console_verify.md`
- **개선**: textarea/input을 스크롤러 검출에서 제외

### 3. 캡처 지침서
- **파일**: `status/evidence/ST-1206_T3_S1_S2/capture_instructions.md`
- **내용**:
  - S1/S2 캡처 단계별 가이드
  - Desktop/Mobile 설정
  - 검증 스크립트
  - 체크리스트

## 현재 상태 평가

### ✅ 해결된 문제
1. **Global scroll hidden**: html/body overflow:hidden 적용
2. **Composer actions marking**: data-gg 속성 올바르게 적용
3. **Scroller whitelist**: #gg-threads, #chat-msgs만 허용

### ⚠️ 검증 필요 항목
1. **a1Wrap_rows_ok**: gridTemplateRows가 정확히 3개 값인지 확인
2. **Direct children count**: #a1-wrap 직계 자식이 3개 이하인지 확인
3. **입력창 클리핑**: 모바일에서 키보드 올라올 때 입력창 보이는지 확인

## S1/S2 캡처 준비 상태

### 필수 확인사항
- [x] 서버 실행: `python3 -m http.server 8077`
- [x] 오버레이 파일 업데이트 완료
- [x] 테스트 도구 준비 완료
- [ ] 브라우저에서 실제 테스트 필요

### 테스트 URL
- **로컬 서버**: http://localhost:8077/ui/snapshots/unified_A1-A4_v0/index.html

### 브라우저 테스트 절차
1. URL 접속
2. Simple 모드 확인
3. DevTools 콘솔 열기
4. 테스트 스크립트 실행:
```javascript
// 옵션 1: 간단한 검증
localStorage.setItem('gg_env', 'dev');
location.reload();

// 옵션 2: 포괄적 테스트 (reload 후)
fetch('/ui/overlays/test_guardrails.js')
  .then(r => r.text())
  .then(eval);
```

## 예상 결과

### S1 (초기 상태)
- Grid display: ✅ grid
- Grid rows: ✅ 3개 (auto minmax(0,1fr) auto)
- Global scroll: ✅ hidden
- Scrollers: ✅ 2개 허용
- Direct children: ✅ 3개 이하

### S2 (상호작용 상태)
- 입력창 확장: ✅ 정상
- 생각중 배지: ✅ 겹침 없음
- Composer actions: ✅ 올바른 정렬
- 모바일 키보드: ⚠️ 테스트 필요

## 다음 단계
1. 브라우저에서 실제 테스트 수행
2. rows_ok 통과 확인
3. S1 스크린샷 캡처 (Desktop + Mobile)
4. S2 스크린샷 캡처 (Desktop + Mobile)
5. CKPT 업데이트
6. PR 생성

## 리스크 및 대응
- **리스크**: 일부 페이지에서 여전히 암묵적 row 생성 가능
- **대응**: 
  - 직계 자식 모니터링 강화
  - 필요시 MutationObserver로 동적 감시
  - grid-auto-rows: 0 !important 적용 확인

## CKPT 기록
```jsonl
{"run_id":"72H_20250825_2100Z","scope":"TASK(BT-12/ST-1206 T3)","decision":"Claude 인수받아 implicit row 문제 해결 착수 — ensureComposerWrap 로직 강화, 초기화 순서 정리, 직계 자식 정리 로직 구현","next_step":"브라우저 테스트로 rows_ok 통과 확인 후 S1/S2 캡처 진행","evidence":"gumgang_meeting/ui/overlays/active.js#L16-L100","utc_ts":"2025-08-25T21:00:00Z","seq":1,"writer":"auto"}
```
