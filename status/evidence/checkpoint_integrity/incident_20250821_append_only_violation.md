# Incident Report — Checkpoint Append-Only Violation
File: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
Date: 2025-08-21
Incident ID: CKPT-AO-20250821-01
Reporter: Gumgang (AI)

## 1) Summary
An append-only integrity violation occurred in the single source of truth (SSOT) checkpoint file CKPT_72H_RUN.md. Two BT-13 entries with UTC dates 2025-08-21 were inserted into the upper portion of the file ahead of existing 2025-08-19 entries, breaking chronological and append-only guarantees.

Rules reference
- .rules v3.0 — Section 3 SSOT: “status/checkpoints/*.md (append-only; no edits in place)”

## 2) Scope and Impact
- Affected artifact: status/checkpoints/CKPT_72H_RUN.md
- Nature: Out-of-order insertion (mid-file) of checkpoint blocks
- Impact:
  - Chronological continuity broken (2025-08-21 entries precede 2025-08-19 blocks)
  - Consumers that assume monotonic append or tail-read may misinterpret the latest state
  - Human readers can be misled about the true sequence of BT transitions

## 3) Timeline (UTC)
- 2025-08-21T00:00:00Z — BT-13 “ST-1301 시작 …” block inserted near the top (not at EOF)
- 2025-08-21T08:46:00Z — BT-13 “ST-1301 진행 …” block inserted following the above (still mid-file)
- 2025-08-21T10:29:03Z — BT-13 complete block added (also mid-file region)
- 2025-08-21T10:30:00Z — BT-14 start block added (also mid-file region)
- 2025-08-21T10:35:00Z — Correction entry appended at EOF (canonical directive to trust EOF)
- 2025-08-21T10:36:00Z — Restated BT-14 start entry appended at EOF (canonical start)

Note: Earlier 2025-08-19 entries remained; the violation was introducing later-dated entries before them.

## 4) Evidence Pointers (read-only)
- Mid-file 2025-08-21 insertions: CKPT_72H_RUN.md (near initial lines where first 2025-08-19 block is followed by 2025-08-21 blocks)
- EOF corrections (canonical):
  - 2025-08-21T10:35Z — “CORRECTION — canonical record appended here. Trust EOF order”
  - 2025-08-21T10:36Z — “RESTATE — ST-1401 시작 … canonical start entry at EOF”
- Policy: gumgang_meeting/.rules (Append-only requirement)

## 5) Root Cause Analysis (RCA)
Primary cause
- Procedural lapse: checkpoint entries were added via an edit that placed new content into a mid-file region rather than appending at EOF.

Contributing factors
- No automated guard to enforce EOF-only appends
- Large file size and frequent edits increase risk of cursor misplacement
- Lack of a quick “tail-only” checkpoint helper command

## 6) Containment and Correction (Completed)
- No destructive edits performed; historical lines were not modified or removed.
- Canonical corrections appended at EOF:
  - CORRECTION entry instructing readers/tools to trust EOF order for BT-13
  - RESTATE entry for BT-14 start, establishing a clear, canonical start point at EOF
- This incident report filed for auditability.

## 7) Prevention Plan (Actionable, Non-code for now)
Policy reinforcement
- “EOF or nothing” rule: All checkpoint entries MUST be appended strictly at EOF. Never insert above the last line.
- Single-writer turn: During a checkpoint write, avoid parallel edits; treat SSOT file as mutex resource.

Operator checklist (pre-append)
1) Tail-check: read the last 40–80 lines and confirm the most recent UTC_TS is the expected predecessor.
2) Clock-check: ensure new UTC_TS is strictly ≥ last entry time (chronological).
3) Format-check: verify 6-line format (RUN_ID, UTC_TS, SCOPE, DECISION, NEXT STEP, EVIDENCE).

Operator checklist (post-append)
1) Tail-verify: re-open last 40–80 lines; confirm your entry is at EOF and correctly formatted.
2) Diff-verify: ensure only an EOF addition occurred (no mid-file change).
3) Log note: if a mistake happens, do not edit history; append a CORRECTION entry at EOF.

Process/tooling (to be implemented in BT-14+)
- Add a tiny “checkpoint tail-writer” helper that:
  - Reads last entry, validates monotonicity, then appends atomically at EOF
  - Refuses to write if the file changed since read (basic concurrency guard)
- Add a CI/validation script (local pre-commit or manual checker) that:
  - Ensures the last N timestamps are monotonically increasing
  - Flags any 6-line block detected in non-chronological zones
- Optional: write a daily “index pointer” file with the last checkpoint hash/time to cross-check anomalies quickly.

Documentation
- Append “EOF-only writing” and the above checklists to status/notes/ and reference in the README/Contributor section.
- Include “CORRECTION at EOF” as the sole remediation method; editing history remains prohibited.

## 8) Severity and Risk
- Severity: Medium (SSOT logic risk; mitigated through canonical EOF corrections)
- Residual risk: Low after adoption of EOF-only guard and tail-writer helper

## 9) Follow-ups (Owner: Gumgang AI; Deadline: Start of BT-14)
- Draft checkpoint tail-writer spec (no code yet; BT-14 item)
- Draft checkpoint integrity checker spec (no code yet; BT-14 item)
- Update contributor guidance to emphasize EOF-only and correction protocol

## 10) Lessons Learned
- SSOT files require stricter ergonomics (tail-only helper) to prevent human/tool cursor mistakes.
- Corrections must preserve immutability: never edit history; always append a canonical directive at EOF.

— End of Report —