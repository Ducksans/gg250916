# ST-1206 T3 — UI Pitstop(Simple) Slices Plan

목적
- A1 채팅을 ChatGPT 단일 스크롤 UX로 개편하되 비파괴(Simple 모드만 적용).
- 상태 스트립 동기화, Recent 바인딩, Evidence 기본 접힘, 접근성 보강.

근거(Evidence)
- 설계서: gumgang_meeting/status/design/threads/ST-1206_ThreadUX_v1.md#L183-226
- 대상 파일: 
  - ui/overlays/active.css
  - ui/overlays/active.js
  - ui/snapshots/unified_A1-A4_v0/index.html

Slices (S1 → S7)
- S1 CSS 스켈레톤: body.simple에서 전역 스크롤 숨김, #gg-threads · #chat-msgs만 overflow:auto. 우측 #a1-wrap 3행 grid(auto 1fr auto).
- S2 상태바 동기화: #gg-status-strip 실측→:root --gg-strip-h 갱신(ResizeObserver), nearBottom/scrollToBottom 유틸.
- S3 충돌 리셋: body.simple 범위에서 legacy max-height/overflow 무력화(min-height:0, overflow:visible).
- S4 헤더/칩: SGM/Source/Thread/Bridge/Chain 칩 갱신, convId 칩·복사, 모드 토글, 좌측 Threads 패널 컨테이너 생성.
- S5 Evidence 접힘: 타임라인에 요약칩(“증거 N건 · mix”) 추가, details/summary 또는 gg-ev 블록으로 접힘 기본.
- S6 Recent 바인딩: onReady 즉시 /api/threads/recent 로드, 현재 convId 자동 선택, read 시 turns 렌더.
- S7 접근성/앵커: #chat-msgs aria-live="polite", focus 순서(Threads→헤더→타임라인→입력→보내기), “새 메시지” 토스트.

QA 체크리스트
- 전역 스크롤바 0, 내부 스크롤 2개만(#gg-threads, #chat-msgs).
- 컴포저 하단 고정, 새 메시지 시 하단 근접 시에만 자동 스크롤.
- 상태 스트립 칩 토글 시 레이아웃 흔들림 없음, --gg-strip-h 즉시 반영.
- Recent 진입 즉시 표시, convId 변경 시 /read 로드 OK.
- Evidence 기본 접힘, 중복 블록 비노출.
- A11y: aria-live, :focus-visible, 키보드 순서 OK.
- 모바일 회전/키보드 시 레이아웃 안정, 콘솔 에러 0.

롤백
- 즉시 복귀: localStorage.gg_ui_mode='pro' 또는 document.body.classList.remove('simple').

로그/증적
- 상태: status/evidence/ui_pitstop/*.md|png
- 필요시 브릿지 열람: /status/evidence/ui_runtime_*.jsonl (overlay 단축키 안내 참조)