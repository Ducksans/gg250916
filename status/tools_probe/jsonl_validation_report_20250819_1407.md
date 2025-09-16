---
phase: past
---

# JSONL Validation Report — ST-0302
Date: 2025-08-19T14:07:44Z
Subject: Append-only conversation/task log validation
Inputs:
- Log: gumgang_meeting/conversations/GG-SESS-20250819_1405Z/CONV_LOG.jsonl#L1-8
- Spec: gumgang_meeting/status/notes/jsonl_logging_spec.md#L1-46

Scope of Checks
- Parsing & header format
- Required fields presence
- Timestamp ordering (non-decreasing)
- Duplicate event detection (by signature)
- Evidence presence for decisions
- Append-only indicators (best-effort)

Summary
- PASS: JSONL parse, header present with schema gg.convlog.v1
- PASS: Required fields present on all event lines (ts, actor, event, bt, st, message, evidence)
- PASS: Evidence paths present on all event lines
- PASS: Duplicate signature check — none detected
- WARN: Timestamp non-decreasing violated between lines:
  - L2 ts=2025-08-19T14:05:06Z → L3 ts=2025-08-19T14:02:20Z (regression)
  - L3 → L4 same timestamp (ok), L4 → L5 same timestamp (ok), L5 → L6 ts=14:05:06Z (non-decreasing), L6 → L7 ts=14:05:30Z (ok), L7 → L8 ts=14:07:00Z (ok)
- PENDING: Terminal state for ST-0302 not yet recorded (st_pass/fail)

Details

1) Parse & Header
- Line 1 is a header: {"schema":"gg.convlog.v1","append_only":true,"session_id":"GG-SESS-20250819_1405Z","run_id":"72H_20250819_1114Z"} — OK.

2) Required Fields
- Lines 2–8: all include ts, actor, event, bt, st (nullable), message, evidence — OK.

3) Timestamp Ordering
- Expected: non-decreasing per spec.
- Observed: L3 (14:02:20Z) is earlier than L2 (14:05:06Z) → WARN.
- Note: Append-only systems may ingest late events; treat as WARN unless strict ordering is mandated for PASS. Current PASS criteria in spec does not make this a hard fail.

4) Duplicate Detection
- Signature(actor,event,bt,st,message,evidence): all unique — OK.

5) Evidence Presence
- All event lines include non-empty evidence — OK.

6) Append-only Indicators
- File shows monotonic growth; no blank lines; no edits detectable from content snapshot — OK (best-effort).
- seq/rolling-hash not present (optional), recommend adding for stronger tamper evidence.

Open Items
- ST-0302 terminal state missing (expected st_pass or st_fail after validation).
- Timestamp regression WARN outstanding.

Recommendations
- Do not edit past lines (append-only). Append a correction note event:
  {"event":"correction","reason":"out_of_order_ts","target_lines":[3],"ts":"<now>Z", ...}
- From now on, ensure writer buffers events in ts order before append.
- Optionally add:
  - seq field (incremental)
  - rolling hash anchor stored in status/evidence

Verdict (current log snapshot)
- ST-0302 Validation: PARTIAL PASS (meets PASS criteria for duplicates and append-only; WARN on timestamp ordering; terminal state pending)

Evidence
- Log: gumgang_meeting/conversations/GG-SESS-20250819_1405Z/CONV_LOG.jsonl#L1-8
- Spec: gumgang_meeting/status/notes/jsonl_logging_spec.md#L1-46