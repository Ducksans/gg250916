---
phase: past
---

# ST-1206 T3 — UI Pitstop(Simple) 인계(Claude)

## 현황 요약
- **가드레일 3층 구조 적용**: .rules + 정적 검사(npm run guard:ui) + 런타임 센서
- **통과 상태**
  - ✅ global scroll hidden: html/body 모두 hidden OK
  - ✅ 허용 스크롤러 2개(#gg-threads, #chat-msgs) OK
  - ✅ composer actions 마킹 OK([data-gg="composer-actions"])
- **미해결 핵심**
  - ❌ a1Wrap_rows_ok=false: getComputedStyle(#a1-wrap).gridTemplateRows가 4 트랙으로 계산됨
    - 재현 값 예: "75.7955px 633.31px 99.7159px 0px"
    - #a1-wrap 직계 자식이 3행 템플릿을 넘겨 암묵적 4번째 row가 생성됨
  - ⚠️ 입력창 하단이 간헐적으로 클리핑되는 체감

## 원인 정리(최신 기준)
- **wrap 직계 자식이 많아 암묵 행 생성**
  - 현재 직계: div.row(툴바류), #chat-msgs, div.row(버튼), #composer-wrap, #consent-bar, #a1-usage …
  - 우리는 anchor-result/consent-bar/a1-usage를 #chat-msgs 내부로 이동시키고,
    composer 관련 노드는 display:contents 래퍼(#composer-wrap)로 정리하여 3행 템플릿을 유지하려 함
- **일부 페이지에서 재배치 타이밍 또는 조건 매칭으로 인해 여전히 wrap 직계에 잔존 노드가 남아 4번째 row가 생성됨**
- **textarea 네이티브 스크롤은 센서에서 제외하도록 완화(오검출 방지)**

## Claude가 수행해야 할 구체 작업

### 1) 암묵 4번째 row 제거(최우선)
- #a1-wrap 직계 자식 중 다음을 #chat-msgs 내부로 강제 이동 또는 숨김
  - #anchor-result, #consent-bar, #a1-usage, 기타 .row 중 타임라인 하단 보조 블록
- ensureComposerWrap()가 항상 먼저 실행되도록 보장하고, display:contents 래퍼에 textarea/버튼/앵커를 수용
- grid-auto-rows: 0 !important는 이미 적용되어 있음(활성 검증)
- **검증**: getComputedStyle(#a1-wrap).gridTemplateRows의 값 개수가 정확히 3개인지 확인

### 2) rows_ok 판정 통과
- 센서 기준: gridTemplateRows에 /minmax\\(0(px)?, 1fr\\)/i 포함
- 필요 시, wrap.style.gridTemplateRows를 인라인으로 재보강(auto minmax(0,1fr) auto)

### 3) 입력창 클리핑 종결
- #chat-input: overflow:visible, max-height:35vh 유지
- #chat-msgs: grid-row:2, min-height:0, overflow-y:auto 유지

### 4) 센서/정적 가드 재확인
- npm run guard:ui → OK
- DEV_console_verify MAIN 스니펫 → 모든 assertion 통과

### 5) 산출물
- S1/S2 스크린샷(PC/Mobile, 키보드 온/오프 포함)
- CKPT JSONL 2줄(S1 통과, S2 통과)
- PR 생성: 브랜치 feat/st1206-guardrails, 제목 "ST-1206 T3(Simple) S1/S2 캡처+가드레일 통과"

## 참고 파일(에비던스)
- **규칙**: gumgang_meeting/.rules, rules/ai/ST-1206.ui.rules.md
- **스냅샷**: ui/snapshots/unified_A1-A4_v0/index.html
- **오버레이**: ui/overlays/active.css, ui/overlays/active.js, ui/overlays/labs/*
- **검증 스니펫**: ui/overlays/DEV_console_verify.md
- **현재 콘솔 지표**: html/body hidden OK, scrollers 2 OK, composerActions OK, rows_ok false(implicit row), textarea 오검출은 무시 가능

## 기술 상세

### 현재 #a1-wrap 구조 문제
```html
<div id="a1-wrap"> <!-- grid: auto minmax(0,1fr) auto -->
  <div class="row">...</div>       <!-- 행 1 -->
  <div id="chat-msgs">...</div>    <!-- 행 2 -->
  <div class="row">...</div>       <!-- 행 3 -->
  <div id="composer-wrap">...</div> <!-- 암묵 행 4 (문제) -->
  <div id="consent-bar">...</div>   <!-- 암묵 행 5 -->
  <div id="a1-usage">...</div>      <!-- 암묵 행 6 -->
</div>
```

### 목표 구조
```html
<div id="a1-wrap"> <!-- grid: auto minmax(0,1fr) auto -->
  <div class="row">...</div>       <!-- 행 1 -->
  <div id="chat-msgs">            <!-- 행 2 -->
    <!-- 메시지들 -->
    <div id="anchor-result">...</div>
    <div id="consent-bar">...</div>
    <div id="a1-usage">...</div>
  </div>
  <div id="composer-wrap" style="display:contents"> <!-- 행 3 (display:contents로 grid 참여 안함) -->
    <div class="row">...</div>
    <textarea id="chat-input">...</textarea>
    <div data-gg="composer-actions">...</div>
  </div>
</div>
```

## 트리거 문장 (새 스레드용)
- **스레드명**: gg_20250825_t3_ui_pitstop_guardrails_claude
- **트리거**: "ST‑1206 T3 — UI Guardrails 상태에서 S1/S2 디버깅 인수 받습니다. rows_ok 미충족(implicit 4th row) 원인 제거 → 캡처(데스크탑/모바일) → CKPT → PR 순으로 진행합니다."

## 진행 상태 추적
- [ ] #a1-wrap 직계 자식 정리 완료
- [ ] gridTemplateRows 3개 값 확인
- [ ] 런타임 센서 모두 통과
- [ ] npm run guard:ui 통과
- [ ] S1 스크린샷 캡처 (데스크탑/모바일)
- [ ] S2 스크린샷 캡처 (데스크탑/모바일)
- [ ] CKPT JSONL 업데이트
- [ ] PR 생성 및 제출