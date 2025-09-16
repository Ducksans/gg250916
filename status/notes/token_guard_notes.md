---
phase: past
---

# Token Guard Notes — BT-03/ST-0301

Purpose
- Define thresholds and behaviors for length/token alerts and STOP NOW handling to enforce guardrails.

Limits
- Output limit: ≤ 1,200 chars per turn.
- Token estimate heuristic: tokens ≈ ceil(chars / 4). Alert ratios computed vs 1,200-char limit (proxy for budget).

Alerts (trigger the highest that applies)
- [ALERT70] ≥ 70% budget:
  - Start summarizing; compress background; prefer bullets; prioritize decision/next step + one evidence path.
- [ALERT85] ≥ 85% budget:
  - Force summary mode; output only: brief conclusion, next step (verb-first), one evidence path; drop extras.
- [ALERT95] ≥ 95% budget:
  - Minimal context mode: output only system/current task/last decision/next step + one evidence path; no extras.

STOP NOW (preempts all)
- If user input contains “STOP NOW”:
  - Immediately switch to minimal context mode (same as [ALERT95]).
  - Do not proceed further; end with “Awaiting next directive.”

Evidence Rule
- Any claim/decision affecting actions must cite ≥1 concrete path (prefer path#Lx-y).

Turn Ritual Interaction
- Echo → Delta → Execute, but alerts/STOP NOW can truncate at any stage per above rules.

Operational Flow (pseudo)
1) Detect STOP NOW → minimal context → end.
2) Else compute ratio → select alert level.
3) Trim content per level; ensure evidence path present.
4) Enforce ≤1,200 chars hard cap.

Examples
- 68%: normal, but concise.
- 72%: [ALERT70] switch to bullet summary.
- 86%: [ALERT85] force summary: decision + next step + evidence.
- 96% or STOP NOW: minimal context only.

PASS Criteria (ST-0301)
- Demonstrate all three alerts and STOP NOW mapping to the specified behaviors with compliant outputs and evidence paths.