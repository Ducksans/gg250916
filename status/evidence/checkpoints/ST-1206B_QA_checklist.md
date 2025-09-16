---
phase: past
---

# ST-1206B — S5 QA Checklist (ChatGPT-like Single-Scroll, Simple mode)

Scope/Goal
- Remove global scroll; only two inner scrolls exist (left: threads, right: chat). Status strip height syncs via --gg-strip-h; right pane = header auto / timeline 1fr / composer auto.

Pre-flight
- [ ] localStorage.gg_ui_mode = "simple"
- [ ] Status strip visible (chips: SGM, Sources, conv, Bridge, Chain)
- [ ] Threads pane present (or toggle via kebab)

Checks
- [ ] Global: html/body show no page scrollbar
- [ ] Left: #gg-threads scrolls; stays below strip; sticky top matches strip height
- [ ] Right: #a1-right grid 3 rows; #chat-msgs alone scrolls; composer remains pinned
- [ ] Strip sync: expand/collapse elements on strip; layout adjusts immediately (no overlap)
- [ ] Long content: many turns in #chat-msgs — smooth wheel/trackpad scroll; no jank
- [ ] Mobile/small viewport: 100dvh and overscroll-behavior contain work; rotate device — layout correct
- [ ] Conflict resets: any legacy max-height/overflow rules do not produce double scrollbars
- [ ] Console: no errors/warnings related to overlay/resize/mutation
- [ ] Performance: no layout thrash (resize observer), memory stable over 3 min idle

Pass Criteria
- [ ] Exactly two scrollbars (threads, chat timeline)
- [ ] Composer always visible; status strip never overlaps content
- [ ] No console errors; UX matches ChatGPT-style behavior

Capture/Evidence
- [ ] Screenshots (full window): before/after, long chat, mobile/rotate
- [ ] Console log snippet (no errors)
- [ ] Note strip height values observed (px) before/after interactions
- [ ] Save under: status/evidence/ui_guard/ (bundle with timestamp)

Rollback
- Set gg_ui_mode = "pro" to revert; or uncheck “threads collapsed” if left pane hidden.

References (Evidence pointers)
- Design plan: gumgang_meeting/status/design/threads/ST-1206_ThreadUX_v1.md#L176-213
- Overlay CSS: gumgang_meeting/ui/overlays/active.css
- Overlay JS (wrapper + strip sync): gumgang_meeting/ui/overlays/active.js