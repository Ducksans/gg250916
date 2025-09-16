---
phase: past
---

# Checkpoint — v0 Pending UX + Compact + Cumulative Tokens (append-only)

RUN_ID: CKPT_2025-08-18_v0_pendingUX_compact_tokens
DATE: 2025-08-18
SCOPE: UI snapshot unified_A1–A4 (local bridge)
APPEND_POLICY: This file is append-only. Create a new checkpoint for future changes.

## 1) Overview
We stabilized the A1–A4 UI flow with minimal, reversible UX devices:
- Compact v0 for “agreement-first” interactions
- Cumulative token usage indicator with thresholds
- Warm, witty progressive pending messages (no misleading timeouts)

These reduce perceived latency, increase psychological safety, and keep “노삽질” principles visible without touching docs/ (SSOT remains frozen).

## 2) Changes Implemented (v0)

A) Compact v0 (A1 + A4)
- A1: Compact toggle (default ON) and “새 스레드” button
  - On “새 스레드”: local history reset, conv badge reset, one-time system prompt injection flag set
  - One-time system message prefixed with “[compact:v0] …” injected on the first send after new thread (if toggle ON)
- A4: “치트시트” button (read-only dialog showing Compact v0 quick rules)
- Keys:
  - gg_compact_enabled: "true" | "false"  (default "true")
  - gg_compact_text: string (editable prompt text)
  - gg_compact_inject_next: "1" | "0" (one-shot injection flag)

B) Cumulative token usage (A1)
- Shows “Σ usage: <cumulative> / <budget> (<pct>%) — <OK|WARN|ERROR note>”
- Color-coded by data-level:
  - ok: #22c55e, warn: #eab308, error: #ef4444 (bold)
- Budget from gg_test_budget_tokens (default 3000; can be set to 272000)
- Accumulates per assistant turn (uses real usage if provided; falls back to heuristic)
- Resets on “새 스레드”
- Keys:
  - gg_cum_tokens: number (persistent)
  - gg_test_budget_tokens: number (default 3000; common test value 272000)

C) Pending UX — warm, witty progressive messages (A1)
- Replaces “시간 초과” with staged, human-friendly copy and elapsed time
- Stages (defaults, ms): init(0), slow(≥12s), soft(≥45s), hard(≥90s)
- Each stage rotates tips every ~8s, avoiding immediate repeats
- “취소” button appears at soft+ (UI cancel; no auto-failure text)
- On success: arrival shows “( +N초 )”
- Keys:
  - gg_timeout_slow_ms: 12000
  - gg_timeout_soft_ms: 45000
  - gg_timeout_hard_ms: 90000
  - gg_loading_tips_interval_ms: 8000
  - gg_loading_tips_init/slow/soft/hard: JSON arrays for customizable tips
- Default warm tips (examples):
  - init: “생각을 꺼내는 중이에요…”, “실마리를 모으는 중…”, “첫 수를 고르고 있어요…”
  - slow: “카드 한 장 더 뽑아 볼게요… (+{s}초)”, “조금만 더 다듬는 중이에요 (+{s}초)”, “좋은 비유를 찾는 중… (+{s}초)”
  - soft: “좋은 답을 위해 곱씹는 중… (+{s}초) — 취소 가능”, “한 턴만 더 고민 중입니다 (+{s}초) — 취소 가능”, “경우의 수를 돌려보고 있어요 (+{s}초) — 취소 가능”
  - hard: “깊게 고민 중… (+{s}초)”, “멀리 왔네요… (+{s}초)”, “정교함을 조금 더 챙기는 중… (+{s}초)”

D) Bug fix
- Removed legacy slowTimer/hardTimer references that caused “slowTimer is not defined” under new pending flow.

## 3) Verification (done)
- Compact v0
  - New thread → first send contains one-time “[compact:v0] …” system message only once
  - A4 cheatsheet opens and reflects gg_compact_text
- Cumulative usage
  - Σ usage updates after responses; color status matches thresholds (85/95%)
  - New thread resets Σ usage to 0
- Pending UX
  - Shows warm tips per stage with +N초
  - No automatic “시간 초과” labeling; “취소” appears ≥soft
  - Response arrival appends “(+N초)”

## 4) Known Limitations / Follow-ups
- “취소” is UI-level only; underlying fetch is not aborted (OK for v0). Optional: AbortController for hard-cancel.
- Streaming is not implemented; future option (SSE/SSE-like).
- Mode switching (회의↔실행) natural-language consent guard is not yet implemented (see Next Actions B).

## 5) Operator knobs (localStorage)
- Compact: gg_compact_enabled, gg_compact_text, gg_compact_inject_next
- Budget/tokens: gg_test_budget_tokens, gg_cum_tokens
- Pending thresholds & tips: gg_timeout_* ms keys, gg_loading_tips_interval_ms, gg_loading_tips_{init|slow|soft|hard}

Quick test helpers:
- set budget: localStorage.setItem('gg_test_budget_tokens','272000')
- reset Σ: localStorage.setItem('gg_cum_tokens','0')
- speed up pending stages (for testing):
  - localStorage.setItem('gg_timeout_slow_ms','2000')
  - localStorage.setItem('gg_timeout_soft_ms','4000')
  - localStorage.setItem('gg_timeout_hard_ms','6000')
  - localStorage.setItem('gg_loading_tips_interval_ms','1500')

## 6) Next Actions (ordered)
A) A4 운영 로그 강화
- Badges/buttons:
  - request_id (copy)
  - upstream_model (display)
  - cache hit ratio: cached_tokens / prompt_tokens (when available)
- Styling aligned with engine/conv badges

B) 회의/실행 모드 전환 v0
- Natural language intent detection
- “애매하면 질문”: Consent bar [실행] [회의 계속]
- Execute only after explicit consent; preflight checklist on transition

C) Optional enhancements (later)
- AbortController for true cancel
- SSE/streaming for progressive output

## 7) Rollback
- Toggle Compact OFF; remove gg_compact_inject_next
- Clear testing overrides in localStorage
- No server or docs changes were required

## 8) Evidence / Touchpoints
- UI: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html
- Bridge: gumgang_meeting/bridge/server.js (no changes in this checkpoint)
- Conversations: one-time system “[compact:v0] …” visible at first turn of new thread

--- 
Recorded by: 금강(assistant)
Approved by: 덕산(user)
Status: Applied (local UI), append-only checkpoint created