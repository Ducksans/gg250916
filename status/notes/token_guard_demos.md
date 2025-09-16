---
phase: past
---

# Token Guard Demo Outputs — BT-03/ST-0301

This file demonstrates compliant sample replies for ALERT70, ALERT85, ALERT95, and STOP NOW, each with Next Step and Evidence.

## ALERT70 Demo (≥70% budget — summarize, keep essentials)
Decision: Proceed with token guard validation; compress non-essential context.
- Scope: GATE_GUARD checks for length/token thresholds
- Behavior: summarize; keep decision, next step, evidence
- Constraint: ≤1,200 chars per turn, prefer bullets
Next Step: Draft concise verification outputs for all alert levels.
Evidence: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63

## ALERT85 Demo (≥85% budget — force summary only)
Conclusion: Thresholds recognized; switching to forced summary mode.
Next Step: Emit minimal proof lines per level and record in notes.
Evidence: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63

## ALERT95 Demo (≥95% budget — minimal context only)
System: GATE_GUARD active
Task: BT-03/ST-0301
Last Decision: ST-0301 시작 — 길이/토큰/STOP NOW 경보 검증
Next Step: Produce one-line minimal outputs with evidence for each level.
Evidence: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63

## STOP NOW Demo (preemptive minimal mode)
Detected: "STOP NOW"
System: GATE_GUARD active
Task: BT-03/ST-0301
Last Decision: ST-0301 시작 — 길이/토큰/STOP NOW 경보 검증
Next Step: Await further instruction; no additional processing.
Evidence: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63
Awaiting next directive.