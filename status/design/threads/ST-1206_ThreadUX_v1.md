# ST-1206 — Thread UX v1 설계서(v1 Final)
Status: Approved (최종) · Owner: Zed @ 금강 · Scope: BT-12/ST-1206
Intent: A1 채팅에 스레드 UX v1을 완성(append-only 영속화, convId/제목/태그 메타, 복구/최근목록), SGM(Strict Grounded Mode: refs=0 차단) 유지.

## 0) 요약(Goals/Non‑Goals)
- Goals
  - 스레드 로그(JSONL, append-only), convId 규칙, 제목(1회 업그레이드 후 잠금), 태그 v1, 복구/최근 목록, SGM 차단 라인 기록.
  - API 3종: POST /api/threads/append · GET /api/threads/recent · GET /api/threads/read
  - 오류코드·사이즈 상한·멱등성·보안 가드 정립.
- Non‑Goals (v1.1+로 이월)
  - 해시체인 무결성, 범위 읽기(from_turn, limit), recent cursor, OTel 계측, 압축/회전, meta patch/search.

## 1) 저장/경로(SSOT·Append‑Only)
- 파일 경로: gumgang_meeting/conversations/threads/YYYYMMDD/<convId>.jsonl
- 규칙: 1줄=1턴, append‑only(수정/삭제 금지), PII_STRICT 준수.
- 로컬 캐시:
  - gg_thread::<convId>    // 턴 배열(경량)
  - gg_thread_meta::<convId> = { title, title_locked, tags[], created_ts, updated_at, updates }
  - gg_threads_index = { [convId]: { last_ts, day } }
- 복구: 초기 로드 시 로컬 우선 렌더 → 서버 /read로 보강(머지는 v1 간단: 마지막 이후만 덧붙임).

## 2) JSONL 스키마(확정·서버가 최종 ts)
한 줄=한 턴. 서버가 ts(UTC, ISO8601Z)를 최종 결정(클라 ts 무시/참고). evidence_path 규칙: grounded 응답 필수, 차단/메모 선택.
```json
{
  "ts": "2025-08-25T07:13:36.005Z",
  "convId": "gg_YYYYMMDD_<base36/8>",
  "turn": 12,
  "role": "user|assistant|system",
  "text": "...",
  "refs": ["path#Lx-y", "..."],
  "meta": {
    "title": "...",
    "title_locked": true,
    "tags": ["t1","t2","t3"],
    "sgm_blocked": false,
    "hint": null,
    "evidence_path": "status/evidence/memory/unified_runs/20250825/run_xxx.json",
    "tz_client": "Asia/Seoul"
  }
}
```
- 사이즈 상한: 요청 text ≤ 16KB, JSONL 1라인 ≤ 64KB(초과 시 413).
- v1.1 옵션: `"hash":{"prev":"<sha256>","self":"<sha256>"}` 체인.

## 3) convId 규칙/안전성
- 생성 규칙: `gg_YYYYMMDD_<base36/8>` (예: gg_20250825_k9z5u2q1)
- 서버 safe_id() 정규화. 파일 존재 시 충돌 회피: 랜덤 접미 재발급 → 응답 본문에 최종 convId 반환.

## 4) 제목/태그 정책
- 제목
  - Draft: 첫 사용자 문장 24–40자(마침표/구두점 기준).
  - 업그레이드(최대 1회): 트리거(턴≥3 OR refs≥1 OR text≥200자) 충족 시 요약 재생성→title_locked=true. 업그레이드 성공이 /append 라인으로 기록되기 전까지 Draft 유지.
  - 서버 멱등: title_locked=true 이후 제목 변경 요청은 409 거부.
- 태그 v1
  - 디바운스: 60초 또는 3턴 단위.
  - 필터: 불용어(KR/EN), 숫자, 2자 이하, URL/이모지 제거.
  - 안정화: 이전 태그와 Jaccard ≥ 0.7이면 변경 보류(출렁임 억제).
  - 최종 5–8개(후보 30→TF 상위 12→화이트리스트 승격→상위 5–8).

## 5) SGM 연동(필수)
- refs=0: 답변 차단. /append에 차단 라인 기록(meta.sgm_blocked=true, meta.hint 포함).
- meta.hint 포맷(고정 예시):
```json
{
  "reason":"zero_refs",
  "suggest":["upload files", "re-run unified search", "narrow query ..."]
}
```
- UI는 suggest를 버튼/링크로 매핑.

## 6) API 규격(v1)
공통: JSON, 200 OK 기본, 오류코드 표준화.

1) POST /api/threads/append
- Request
```json
{
  "convId":"gg_20250825_k9z5u2q1",
  "turn":12,                      // optional; 서버 tail 보정
  "role":"user|assistant|system",
  "text":"...",
  "refs":["path#L3-8"],
  "meta":{
    "title":"...", "title_locked":false,
    "tags":["..."], "sgm_blocked":false,
    "hint":null, "evidence_path":"...", "tz_client":"Asia/Seoul"
  }
}
```
- 처리
  - convId safe_id, 파일 존재 시 재발급(최종 convId 반환); 경로는 realpath로 conversations/threads/ prefix 검증.
  - 직렬화 후 바이트 기준(UTF-8) 64KB 검사 + 요청 text 16KB; 항상 마지막에 "\n" 추가.
  - append 원자성: 파일 O_APPEND 모드 + 파일 락(flock/fcntl) → write → flush() → fsync().
  - 멱등: (convId, sha256(text+role), ±2s) 기준 중복 차단(재시도 시 200 동일 응답).
  - turn 보정: 쓰기 직전 tail 재확인 후 tail+1 할당(동시 요청 경쟁 조건 방지).
  - 제목 잠금: 서버가 멱등 적용(title_locked=true 이후 제목 변경 409).
  - ts는 서버가 UTC 밀리초 고정 포맷으로 채움: datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z").
- Response: 200 { ok, convId, path, turn }, 오류: 400 schema, 409 title_locked 위반, 413 too large, 422 unprocessable, 500 internal.

2) GET /api/threads/recent?limit=20
- 응답: { convId, title, title_locked, last_ts, top_tags[<=3], approx_turns }
- 제약: 기본 20, 최대 100. 최신 mtime/last_ts 내림차순.
- 인덱스: append 시 day/last_ts/approx_turns 경량 인덱스 동시 갱신(서버).

3) GET /api/threads/read?convId=...
- v1: 전체 읽기(소형), v1.1: from_turn, limit 추가 예정.
- 응답: { convId, day, turns[], path }

## 7) UI(A1) 반영
- 헤더: SGM 배지 · convId 칩(복사) · 제목(🔒) · 태그칩(접힘/펼침) · Recent 셀렉터.
- 전송 파이프: LLM 호출 전 SGM 판정(Top-K=0이면 즉시 차단 라인 기록) → 로컬 캐시 append → /append 비동기(실패 무시, 경고 점) → 기존 메모리 저장/통합검색.
- 최근 목록: “YYYY.MM.DD · 제목(🔒)” + 최신시각 + 태그 상위 3.

## 8) 오류/롤백 시나리오
- /append 실패: UI는 로컬 캐시 유지, 배지로 경고 표시. 서버 복구 후 재시도 가능.
- 서버 비활성: THREADS_ENABLED=false로 즉시 차단(HTTP 503).
- 데이터: JSONL append-only로 무결성 보존(수정 불가).

## 9) 테스트(AC 포함)
- Acceptance Criteria
  - /api/threads/append/recent/read 200 동작, append-only 파일 생성.
  - 새 스레드 시작 시 제목 표시 → 최대 1회 업그레이드 후 🔒 잠금(서버 409 보호).
  - 새로고침 후 대화/제목/태그/최근 목록 복구.
  - SGM 차단 시 JSONL에 sgm_blocked=true 라인이 남고, UI 템플릿이 hint.suggest로 렌더.
  - 오류코드/사이즈/멱등 정책 반영.
- 수동(6)
  1) Draft→업그레이드🔒
  2) 새로고침 복구(로컬→서버)
  3) refs=0 차단 UX/라인 기록
  4) 태그 디바운스 후 안정
  5) recent 전환/정렬
  6) 긴 스레드(파일 기준 tail 시나리오) 표시 확인
- 단위(8)
  - title_upgrade_once, tag_extract, safe_id, tail_lines, schema_validate, size_limits, title_locked_conflict(409), recent_sort.

## 10) 구현 순서·게이트
- 순서: T1(API) → T3(UI) → T4(복구/최근) → T5(테스트)
- Gate‑1(설계 승인) 통과(본 문서). Gate‑2(데이터 불변성): title_locked 이후 제목 변경 거부. Gate‑3(SGM): refs=0 차단+기록 없으면 릴리즈 불가.

## 11) 보안/성능
- 경로 화이트리스트: conversations/threads/ 하위만; realpath로 prefix 검증.
- 파일명 safe_id, traversal 차단; 파일명 길이 ≤ 255 bytes 보장(긴 convId 보호).
- 상한으로 로그 폭주 억제. v1.1: 7일 이전 .gz 압축+인덱스, OTel 계측.

## 12) 의사코드(핵심)
- 제목 업그레이드(1회 멱등)
```js
if (!meta.title_locked && (turn>=3 || refs.length>0 || text.length>=200)) {
  const upgraded = summarizeTitleOnce(history); // 24–40자
  append({role:'system', text:'[title-upgrade]',
    meta:{title:upgraded, title_locked:true}});
}
```
- 태그 추출(디바운스)
```js
if (shouldTagUpdate(history)) {
  const tags = topTags(history); // 불용어/길이필터/Jaccard<0.7
  saveMeta({ tags });
}
```
- SGM 차단 이벤트
```js
if (strict && refsTopK===0) {
  append({role:'assistant', text:'[SGM: 근거 부족 – 답변 보류]',
    meta:{ sgm_blocked:true,
           hint:{reason:'zero_refs', suggest:['upload files','re-run unified search','narrow query ...']} }});
  renderNoEvidenceTemplate();
  return;
}
```

## 13) 체크포인트(SSOT 문구 템플릿)
RUN_ID: 72H_<YYYYMMDD_HHMM>Z  
UTC_TS: <ISO8601Z>  
SCOPE: TASK(BT-12/ST-1206)  
DECISION: ST-1206 설계 승인 — v1 규격 동결, T1(API) 착수  
NEXT STEP: /api/threads/append 스키마·append-only 단위 테스트 통과  
EVIDENCE: conversations/threads/<date>/<convId>.jsonl#L1-1

— End of ST-1206 v1 Final —

## UI Pitstop v1 (Simple Mode) — 2025-08-25

목적  
- A1 중심 재배열로 가독성·집중도 향상, ST-1206 스레드 헤더(제목🔒/convId/태그/SGM) 수용 공간 확보.  
- 백엔드/스키마 무변(CSS/경량 JS만).

핵심 결정(Decisions)  
- D1 전역 2모드: 기본 Simple, 필요 시 Pro (localStorage.gg_ui_mode = 'simple'|'pro').  
- D2 상태 스트립 1줄(5칩): SGM · Sources · Thread(convId) · Bridge · Chain (세부는 케밥).  
- D3 A1 좌/우 2열: 좌 Threads(검색/최근/새로), 우 Chat(헤더=제목🔒·convId·태그칩·SGM칩).  
- D4 Evidence 기본 접힘 + 1행 요약(“증거 N건 · mix”).  
- D5 A2/A3/A4 슬림화: 필수만 노출(나머지 케밥/Drawer).

적용 단계(Hotfix, 비파괴)  
- Step 1: 전역 Simple 모드 + 상태 스트립 + Recent onReady 초기 렌더(현재 convId 자동 선택).  
- Step 2: A1 2열 그리드(좌 Threads/우 Chat) + Evidence 요약칩/접힘.  
- Step 3: A2(Session)/A3(Tools)/A4(Logs) 슬림화(필수만, 기타 케밥/Drawer).

수용 기준(AC)  
- 새로고침 후에도 Simple 유지, 상단은 상태 스트립 1줄만.  
- A1 2열 적용, Evidence 기본 접힘(요약칩 노출).  
- 페이지 진입 직후 Recent 즉시 렌더/현재 convId 자동 선택.  
- /api/chat & /api/threads/append|recent|read 정상.  
- SGM 차단 시 회색 시스템 카드 표준 UI + threads 라인(meta.sgm_blocked=true) 기록.

롤백 전략  
- Pro 모드로 즉시 복귀 가능.  
- 변경은 body.simple 범위의 CSS/경량 JS만 사용(구조/기능 무변).

체크포인트(피트스톱 전용, ST-1206A 권장)  
- START: “ST-1206A UI Pitstop v1 시작 — Simple/StatusStrip/Recent onReady 적용”  
- PASS: “ST-1206A UI Pitstop v1 AC 충족 — A1 2열·Evidence 접힘·Recent 안정화”  
- Evidence: ui 스크린샷 + 관련 HTML/CSS 라인 범위 + threads jsonl 샘플

## 실행 순서(Execution Runbook) — Simple Mode Pitstop(S0–S5)
목표: 상단 상태바(5칩) 고정 + 좌/우 2열(좌 Threads, 우 Chat) 단일 스크롤. Simple(기본)↔Pro(기존) 비파괴 토글.

- 작업 파일(6)
  - ui/overlays/active.css
  - ui/overlays/active.js
  - ui/overlays/labs/default.css
  - ui/overlays/labs/default.js
  - ui/snapshots/unified_A1-A4_v0/index.html
  - ui/proto/chat_view_A1/index.html

S0 프리플라이트(간섭 제거·모드 기본값)
- labs/default.css/js: 레이아웃/overflow 조작 금지 주석 확인(간섭 제거).
- 모드 기본값: localStorage.gg_ui_mode = "simple"(문제 시 pro로 즉시 복귀 가능).

S1 레이아웃(CSS 스켈레톤)
- 변수: :root --gg-strip-h(px), 100dvh 사용, overscroll-behavior: contain.
- 전역 스크롤 차단: body.simple에서만 html/body overflow:hidden.
- 좌/우 2열: #gg-threads(left) + #a1-right(= #a1-wrap 포함).
- 좌(Threads): position: sticky; top: var(--gg-strip-h); height: calc(100dvh - var(--gg-strip-h)); overflow:auto.
- 우(Chat): #a1-wrap 3행 grid(rows: auto 1fr auto), #a1-right/#a1-wrap/#chat-msgs 모두 min-height:0, #chat-msgs만 overflow:auto, 컴포저 하단 고정.
- 충돌 예방: body.simple 범위에서 이전 max-height/overflow 규칙 무력화.

S2 상태바 높이 동기화(JS)
- #gg-status-strip 실측→:root --gg-strip-h 주입.
- ResizeObserver/MutationObserver로 칩/케밥 변화 즉시 반영.
- 모드 토글(예: Shift+S) 및 ggScrollBottom 유틸 노출.
- 자동 스크롤 앵커: nearBottom(<=48px)일 때만 scrollToBottom, 아니면 “새 메시지 N” 토스트/버튼 제공.

S3 골격(HTML 정합)
- unified_A1-A4_v0/index.html: 상태바 + 좌/우 래퍼 구조 확인(Threads/Chat), DOM에 #a1-right 없으면 active.js ensureRightPaneWrapper()로 주입.
- chat_view_A1/index.html: 메시지 블록 표준화(본문/메타, Evidence는 details/summary로 기본 접힘), #chat-msgs aria-live="polite", 포커스 순서(Threads→헤더→타임라인→입력→보내기) 지정.

S4 충돌 제거(이중 스크롤 근절)
- body.simple 범위 리셋: #a1, #a1-right { overflow: visible !important; } #a1, #a1-right, #a1-wrap, #chat-msgs { min-height:0 !important; } #chat-msgs { max-height:none !important; overflow:auto !important; } .panel, .content { overflow:visible !important; } 필요 시 .no-scroll/.can-scroll 유틸 적용.
- 스크롤 허용 컨테이너는 2곳만: #gg-threads, #chat-msgs (그 외는 overflow: visible 유지).

S5 QA(수용 기준 점검)
- 전역 스크롤바 0, 내부 스크롤 2곳(#gg-threads, #chat-msgs)만 존재.
- 컴포저 고정, 새 메시지 시 자동 하단 스크롤.
- 상태바 칩 토글 시 즉시 레이아웃 재계산(겹침 없음).
- 모바일 회전/리사이즈 안정, 콘솔 에러 0.

롤백
- 즉시 복귀: document.body.classList.remove('simple') 또는 gg_ui_mode='pro'.

## Appendix — 벤치마크 링크 & 인용 포인트(요약)
- Slack Block Kit: 메시지를 섹션/액션 최소 단위로 구성해 카드형 컴팩트 UI 지향
- Material 3 Top App Bar/Navigation: 상단 1줄 상태바 고정 + 좌 Threads + 우 채팅(본문만 스크롤)
- Apple HIG Split‑view: 2열(사이드바/컨텐츠) + 경량 도구
- GitHub Primer Timeline: 수직 단일 축 유지, 메타는 보조 패널/접힘
- Anthropic Artifacts: Evidence/파일 미리보기는 접힘 카드 기본, 필요 시 우측 슬라이드 패널
- Obsidian Graph: 중심성/최근성 시각 신호, 클릭=열기 · Shift=프리뷰
- 3d-force-graph: LOD/샘플링·성능 가이드
- cmdk/kbar: ⌘K 팔레트로 스레드/증거/모드 토글 라우팅
- WAI-ARIA Feed: 연속 피드 롤/키보드 상호작용
- Material 3 Typography: line-height≥1.5, 65–80자, 8/12/16px spacing

### URL 모음
- Slack Block Kit: https://api.slack.com/block-kit
- Material Top App Bar: https://m3.material.io/components/top-app-bar/overview
- Material Navigation Rail: https://m3.material.io/components/navigation-rail/overview
- Material Navigation Drawer: https://m3.material.io/components/navigation-drawer/overview
- Material Applying Layout: https://m3.material.io/foundations/layout/applying-layout/overview
- Apple HIG(개요): https://developer.apple.com/design/human-interface-guidelines/
- Primer React Timeline: https://primer.style/react/Timeline
- Primer Typography: https://primer.style/design/foundations/typography
- Anthropic Artifacts: https://docs.anthropic.com/en/docs/build-with-claude/artifacts
- ChatGPT Desktop App for Mac: https://openai.com/blog/introducing-the-chatgpt-desktop-app-for-mac
- Obsidian Graph View: https://help.obsidian.md/Plugins/Graph+view
- 3d-force-graph GitHub: https://github.com/vasturiano/3d-force-graph
- 3d-force-graph Demo: https://vasturiano.github.io/3d-force-graph/
- cmdk: https://cmdk.paco.me/
- kbar: https://kbar.vercel.app/
- WAI-ARIA APG — Feed: https://www.w3.org/WAI/ARIA/apg/patterns/feed/
- Material 3 Typography: https://m3.material.io/styles/typography/overview

### 수용 기준(보강)
- 단일 스크롤: body.simple에서 전역 스크롤 제거(html/body overflow:hidden), 내부 스크롤은 2곳만(#gg-threads, #chat-msgs)
- 레이아웃: 우측 3행 grid(rows: auto 1fr auto), 컴포저 항상 하단 고정
- 스트립 동기화: :root --gg-strip-h 동기화(ResizeObserver/MutationObserver), 높이 계산은 100dvh 기반
- 충돌 방지: legacy max-height/overflow 규칙은 body.simple 범위에서 무력화
- 접근성: #chat-msgs에 WAI-ARIA Feed 패턴 적용(roles/keyboard)
- 팔레트: ⌘K 커맨드 팔레트(새 스레드/최근/증거 토글/Simple↔Pro)
- 아티팩트: Evidence/파일 미리보기는 접힘 카드 기본, 필요 시 우측 슬라이드 패널
- 타이포/간격: line-height ≥ 1.5, 본문 최대 65–80자, 8/12/16px 계열 간격
- 검증: 두 스크롤만 존재, 콘솔 에러 0, 모바일 회전/리사이즈 시 레이아웃 안정

### 바로 적용 체크리스트
- html/body 전역 스크롤 제거(simple 전용), 내부 #gg-threads · #chat-msgs만 overflow:auto
- :root --gg-strip-h 동기화 + 100dvh 사용, overscroll-behavior: contain
- Evidence 요약칩 기본 접힘, 필요 시 우측 패널로 확장
- ⌘K 팔레트로 스레드 전환/증거 토글/모드 전환
- Atlas 상호작용: 클릭=열기, Shift=프리뷰, LOD/샘플링
- A11y: Feed 패턴 키보드/스크린리더 확인

## 추가 제언 (v1 즉시 반영 권장)

### 모바일 키보드/100dvh 대응
- iOS/Safari 100vh 튐 방지: 100dvh 우선, 폴백으로 min-height: 100vh 병행
- 컴포저 하단 패딩: `padding-bottom: max(12px, env(safe-area-inset-bottom));`
- 예시(CSS 스케치)
  - `body.simple #a1, body.simple #a1-wrap { height: 100dvh; min-height: 100vh; }`
  - `body.simple #composer { padding-bottom: max(12px, env(safe-area-inset-bottom)); }`

### 스크롤 앵커 & “새 메시지” 토스트
- 하단 근처일 때만 자동 스크롤: `scrollHeight - (scrollTop + clientHeight) <= 48`
- 하단이 아닐 때는 자동 스크롤 금지 + “새 메시지 N” 토스트/버튼으로 이동
- 헬퍼
  - `function nearBottom(el, px=48){ return el.scrollHeight - (el.scrollTop + el.clientHeight) <= px; }`
  - `function scrollToBottom(el){ el.scrollTop = el.scrollHeight; }`

### 무한 스크롤(과거 로드) 센티널 자리(준비만)
- 상단에 `<div id="sentinel-top"></div>` 배치, v1은 비활성
- v1.1에서 IntersectionObserver로 이전 턴 페이징

### 레이아웃 충돌 방지 리셋(body.simple 범위)
- 중첩 max-height/overflow/sticky 충돌 로컬 리셋
  - `body.simple #app * { overscroll-behavior: contain; }`
  - `body.simple .can-scroll { overflow: auto; }`
  - `body.simple .no-scroll { overflow: hidden; }`

### 상태 스트립 높이 측정 안정화
- ResizeObserver 선호, 미지원 시 MutationObserver + requestAnimationFrame 디바운스(16–32ms)
- 칩 토글/접힘 시 깜빡임 없이 `--gg-strip-h` 갱신

### 접근성(A11y) 최소선
- 포커스 링 보존(:focus-visible), 탭 순서: Threads → 채팅 헤더 → 타임라인 → 입력창 → 보내기
- 타임라인 `aria-live="polite"`로 새 메시지 낭독
- Evidence 토글은 `<details>` 유지

### 성능 가드(긴 스레드)
- DOM 500개 이상 시 간단 가상화(최신 300 유지) 고려
- v1은 CSS 밀도 조정 + 날짜 헤더 접기만으로도 체감 개선

### 테마 토큰화(후속 확장 대비)
- 색/간격/경계 토큰: `--gg-bg, --gg-border, --gg-gap, --gg-radius, --gg-shadow-sm` …
- body.simple 범위에서만 오버라이드(Pro와 충돌 최소화)

### 오류/빈 상태 UX
- Threads 비어있음/로드 실패: 플레이스홀더 + “새 스레드” CTA
- /append 실패: 회색 시스템 카드(“로컬 캐시만 저장됨”) + 재시도 버튼

### 관측 포인트(초경량)
- `data-gg="threads.open"`, `data-gg="evidence.toggle"` 등 라벨링
- BT-15에서 OTel 속성으로 매핑하기 쉬운 이름 규칙 유지

### 다크/모션 선호 반영
- `@media (prefers-reduced-motion: reduce){ *{ scroll-behavior: auto } }`
- 애니메이션·스켈레톤 150ms 이내, 음영 최소

### 테스트 매트릭스(권장)
- 브라우저: Chrome/Edge/Safari(데스크탑) + iOS Safari/Android Chrome
- 케이스: 긴 제목🔒, 태그칩 8개, Evidence 10줄, 가로 1024/1440/1920, 모바일 세로/가로 회전
- 체크: 전역 스크롤 0, 내부 2개만, 컴포저 고정, 새로고침 후 Recent/convId 유지, 콘솔 에러 0

### v1.1 이월(메모)
- 상단/하단 무한 스크롤(페이징), 메시지 가상화
- “최근 스레드” 검색/핀/근거율 칩, Evidence 펼침 상태 로컬 유지
- 키보드 단축키(⌘K 스레드 검색, ⌘/ Evidence 토글 등)

### S0 전 체크(미니)
- Pro 모드와 클래스 체인 충돌 없음: `body.simple …` 셀렉터만 사용했는지
- labs/*에서 overflow/height 조작 금지 주석·가드 처리 확인
- 스트립 높이 변수 `--gg-strip-h`를 모든 레이아웃 계산의 단일 소스로 사용

## Debug Notes / Release Checklist

### RED — 반드시 추가 (Server/Client 공통)
- XSS/렌더링 안전성
  - 채팅 본문·제목·태그는 innerText/textContent만 사용(절대 innerHTML 금지)
  - Evidence 링크는 텍스트/URL을 별도 escape 처리
  - 권장 CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'`
- SGM 서버측 검증
  - 클라이언트 refs 임의 주입 무시, 서버가 refsTopK=0 판정 후 차단/허용
  - /append refs[] 검증: 패턴 `^[\w\/\.\-]+#L\d+(?:-\d+)?$`, 개수 상한 ≤ 20
- 레이트 리밋 & 백프레셔
  - /api/threads/append: 토큰 버킷(IP/convId별 5 req/s, burst 10) → 429 응답
  - 파일 상한: 50MB 초과 시 507/413으로 거부(+회전 플래그)
- 멀티 탭 동기화
  - BroadcastChannel('gg_threads')로 동일 convId 새 라인 브로드캐스트 → 타임라인 동기화
- /read 스트리밍
  - 대형 스레드: 라인 제너레이터/Chunked 응답(전체 메모리 적재 금지)

### YELLOW — 품질 향상 권장
- 입력 정규화
  - UTF-8 NFC 정규화, 제어문자(\\u0000 등) 제거, CRLF→LF 통일
- 제목 업그레이드 레이스
  - 업그레이드는 system turn으로만 기록, Draft 재도착은 409(스펙 재확인)
- 태그 한국어 안정화
  - bi-gram fallback + 짧은 화이트리스트 승격, 소문자/정규화 후 Jaccard 0.7
- 아웃박스(불가시 재전송)
  - /append 실패 시 convId별 outbox 큐에 보관 → 복구 시 재전송(멱등키로 중복 방지)
- 관측(경량)
  - 서버 구조화 로그: `{convId, turn, ms, sizeB, refsN, sgmBlocked, ip}`

### UI/UX 핀셋 팁(현 Pitstop 정합)
- 두 스크롤 보장
  - `#chat-msgs`/`#gg-threads`만 `overflow:auto`; 조상은 `overflow:visible` + `min-height:0`
- iOS 키보드/100dvh
  - `height:100dvh; min-height:100vh;` + composer `padding-bottom:max(12px, env(safe-area-inset-bottom))`
- 자동 스크롤 규칙
  - 하단 근접(≤48px)일 때만 `scrollToBottom()`, 아니면 “새 메시지 N” 토스트
- 접근성(A11y)
  - 타임라인 `role="feed"` + `aria-live="polite"`, “본문 건너뛰고 입력으로” 스킵 링크 1개

### ✅ Release Checklist
- [ ] /append: 파일 락+fsync, 쓰기 직전 tail 재확인으로 turn 할당
- [ ] 멱등키(convId+sha256(text+role)+±2s) 중복 차단 동작
- [ ] 64KB(라인)/16KB(text) 초과 413, /recent 인덱스 갱신 OK
- [ ] SGM 서버판단: refsTopK=0이면 LLM 호출 없이 차단 라인 기록
- [ ] XSS 방어: innerText 렌더, CSP 적용, HTML/URL escape 유닛 테스트 통과
- [ ] 전역 스크롤 0 · 내부 스크롤 2곳만(threads/chat-msgs)
- [ ] iOS/Android 키보드 ↑에서도 composer 미가림(100dvh 동작)
- [ ] 새로고침 후 Recent 즉시 · 현재 convId 자동 선택
- [ ] 멀티 탭 동시 전송 → 라인 중복 없음, UI 실시간 동기화(BroadcastChannel)
- [ ] 콘솔 에러 0