# S1/S2 Capture Runbook — UI Pitstop(Simple)

Purpose
- Capture and verify S1(레이아웃 단일 스크롤) + S2(상태 스트립 동기화·nearBottom) guardrails with screenshots and a single SSOT checkpoint append.

Scope
- Files under test:
  - `gumgang_meeting/ui/overlays/active.css`
  - `gumgang_meeting/ui/overlays/active.js`
  - `gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html`
- Evidence storage root:
  - `gumgang_meeting/status/evidence/ui_pitstop/screenshots/YYYYMMDD/`

Prereqs
- Backend running on 8000 (uvicorn app.api:app)
- Bridge UI (3037) serving snapshots (or open via file URL if your setup differs)
- Overlay auto-injection active (HEAD check to /ui/overlays/active.{css,js})
- Set Simple mode by default:
  - Open DevTools Console on the page and run:
    - localStorage.setItem('gg_ui_mode','simple')

Folder & File Naming
- Create folder: `gumgang_meeting/status/evidence/ui_pitstop/screenshots/<YYYYMMDD>/`
- Name screenshots:
  - Full-page: `S1_full_<w>x<h>_<ts>.png`, `S2_full_<w>x<h>_<ts>.png`
  - Element: `S1_elems_threads-chat-composer_<ts>.png`, `S2_strip_resize_<ts>.png`, `S2_nearBottom_toast_<ts>.png`
  - Console (if needed): `S2_console_<ts>.png`
- Suggested ts: `YYYYMMDD_HHMMSS`

How to Capture (Chrome DevTools)
- Full page: Cmd/Ctrl+Shift+P → “Capture full size screenshot”
- Element: Right-click node in Elements → “Capture node screenshot”

Step-by-Step — S1 Layout (Two scroll containers only)
1) Open: http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html
2) Confirm overlay badges appear (bottom-right “overlay:…” labels).
3) Visually verify:
   - No global scrollbars (html/body)
   - Only #gg-threads (left) and #chat-msgs (right timeline) scroll.
4) Run snippet to list actual scrollers:
   ```
   (function(){
     const nodes=[document.querySelector('#gg-threads'),document.querySelector('#chat-msgs')].filter(Boolean);
     function isScrollable(el){return el && el.scrollHeight>el.clientHeight;}
     const all=[...document.querySelectorAll('body *')];
     const nonVisible=all.filter(el=>{
       const cs=getComputedStyle(el);
       return cs.overflow!=='visible' && cs.overflow!=='hidden' && (el.scrollHeight>el.clientHeight);
     });
     console.log('scrollables (expected 2):', nodes.map(n=>n.id));
     console.log('others with scroll (must be 0):', nonVisible.map(n=>n.id||n.tagName));
   })();
   ```
   Expect: scrollables show `["gg-threads","chat-msgs"]`; others empty.
5) Take screenshots:
   - Full page → `S1_full_<w>x<h>_<ts>.png`
   - Element (threads+timeline+composer in one frame) → `S1_elems_threads-chat-composer_<ts>.png`

Step-by-Step — S2 Strip Sync / nearBottom / Composer fixed
1) Strip height sync (ResizeObserver + rAF):
   - Toggle window size (drag resize) and click status-strip kebab (⋮) to toggle “threads collapsed” and “dense toolbar”.
   - Run:
     ```
     getComputedStyle(document.documentElement).getPropertyValue('--gg-strip-h')
     ```
     Confirm value updates immediately (no layout jump).
   - Screenshot element (strip area + first rows): `S2_strip_resize_<ts>.png`
2) Composer fixed + 100dvh/min-height/safe-area:
   - In DevTools, toggle device toolbar (mobile widths). Ensure composer remains bottom-fixed, not covered.
   - Optional visual cue: in Console run
     ```
     document.getElementById('chat-input').style.boxShadow='0 0 0 2px rgba(34,197,94,.6) inset'
     ```
   - Include this view in your full-page S2 capture.
3) nearBottom behavior:
   - Scroll up so timeline bottom gap > 48px
   - Simulate incoming message:
     ```
     (window.addChatMsg||function(r,c){
       var d=document.createElement('div');
       d.textContent='['+r+'] '+c;
       document.getElementById('chat-msgs').appendChild(d);
     })('assistant','[S2 test] nearBottom off → expect toast');
     ```
   - Expect: No auto-scroll; toast “새 메시지 1”
   - Screenshot element (timeline bottom + toast): `S2_nearBottom_toast_<ts>.png`
   - Scroll to bottom, repeat addChatMsg → expect auto-scroll, no toast.
4) Recent onReady (smoke):
   - Top toolbar Recent dropdown renders; refresh ↻ applies
   - If list empty, see “(최근 없음)” + “＋ 새 스레드” option
5) Evidence collapsed (smoke):
   - Inject hint for summary extraction (optional):
     ```
     window.__recallRefs=['gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl#L1-3'];
     addChatMsg('assistant','[S2 test] evidence refs attached');
     ```
   - Expect “증거 N건 · mix” summary chip after the assistant bubble.
6) Console errors = 0 / A11y signals:
   - DevTools Console level “Errors” — must be empty
   - Elements: confirm `#chat-msgs[role="feed"][aria-live="polite"]` present
     ```
     (function(){
       var el=document.getElementById('chat-msgs');
       console.log('role=', el&&el.getAttribute('role'),' aria-live=',el&&el.getAttribute('aria-live'));
     })();
     ```
   - Optional: Tab order quick-pass (Threads → 헤더/칩 → 타임라인 → 입력 → 보내기)

Quick Acceptance Checklist (fill)
- [ ] Only #gg-threads/#chat-msgs scroll; no other scrollbars
- [ ] --gg-strip-h updates on resize/kebab toggle without flicker
- [ ] Composer stays bottom-fixed on mobile widths; not obscured
- [ ] nearBottom: toast when not near; auto-scroll when near
- [ ] Recent renders on load; refresh works; New CTA on empty/error
- [ ] Evidence summary chip appears; no duplicate blocks
- [ ] Console errors: 0; A11y role/aria-live present

Suggested Evidence Set
- `screenshots/YYYYMMDD/S1_full_<w>x<h>_<ts>.png`
- `screenshots/YYYYMMDD/S1_elems_threads-chat-composer_<ts>.png`
- `screenshots/YYYYMMDD/S2_full_<w>x<h>_<ts>.png`
- `screenshots/YYYYMMDD/S2_strip_resize_<ts>.png`
- `screenshots/YYYYMMDD/S2_nearBottom_toast_<ts>.png`

SSOT Checkpoint (append via API)
- Replace RUN_ID and optionally edit DECISION/NEXT STEP text; keep evidence path to this runbook.
```
curl -sS -X POST http://127.0.0.1:8000/api/checkpoints/append \
  -H "Content-Type: application/json" \
  -d '{
    "run_id":"72H_YYYYMMDD_HHMMZ",
    "scope":"TASK(BT-12/ST-1206 T3)",
    "decision":"T3(Simple) S1·S2 QA 스냅샷 제출 — 단일 스크롤/스트립 동기화/nearBottom 검증",
    "next_step":"S3~S7 순차 적용 및 각 슬라이스 스냅샷 제출",
    "evidence":"gumgang_meeting/status/evidence/ui_pitstop/S1_S2_CAPTURE_RUNBOOK.md#L1-200"
  }'
```

Rollback (if any guardrail fails)
- Switch to Pro: `localStorage.setItem('gg_ui_mode','pro'); location.reload()`
- Remove Simple class temporarily: `document.body.classList.remove('simple')`
- Capture failing view + console log as additional evidence; skip to fix pass.

Appendix — Helpful JS snippets
- List unexpected scrollers:
  ```
  [...document.querySelectorAll('body *')].filter(el=>{
    const cs=getComputedStyle(el);
    return cs.overflow!=='visible' && cs.overflow!=='hidden' && (el.scrollHeight>el.clientHeight);
  }).map(n=>n.id||n.tagName)
  ```
- Read strip height:
  ```
  getComputedStyle(document.documentElement).getPropertyValue('--gg-strip-h')
  ```
- Force applyHeights (if needed during testing):
  ```
  (window.ggScrollToBottom||function(){}); // loads helpers; actions are automatic via overlay
  ```
