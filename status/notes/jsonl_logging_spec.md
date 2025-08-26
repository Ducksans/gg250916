# JSONL Logging Spec — BT-03/ST-0302

Purpose
- Define append-only JSONL logs for conversations/tasks and the validation required to pass GATE_GUARD ST-0302.

Scope & Paths
- File: gumgang_meeting/conversations/GG-SESS-*/CONV_LOG.jsonl
- Format: One JSON object per line (JSONL). No blank lines. UTF-8.

Record Types
- Header (first line):
  {"schema":"gg.convlog.v1","append_only":true,"session_id":"GG-SESS-...","run_id":"72H_..."}
- Event:
  {"ts":"YYYY-MM-DDThh:mm:ssZ","actor":"system|user|tool","event":"...","bt":"BT-..","st":"ST-....|null","message":"...","evidence":"path#Lx-y","seq":n?}

Append-only Policy
- Open in append mode; write newline-terminated JSON; flush+fsync.
- Never edit/remove prior lines. Corrections use event:"correction" with target seq and reason.

Required Event Flow (per session)
- bt_start → st_start (many) → st_pass|st_fail (each st) → bt_complete (once).
- Timestamps non-decreasing.

Validation Checks
1) JSON parse all lines; no blanks. First non-empty is Header with schema=gg.convlog.v1.
2) ts valid RFC3339Z and non-decreasing.
3) Required fields present; evidence path non-empty for decisions.
4) Duplicate detection: signature = SHA256(actor,event,bt,st,message,evidence). No duplicate signatures unless event in {"heartbeat","retry"} with retry_no strictly increasing.
5) Missing terminal state: every st with st_start must have st_pass or st_fail.
6) Append-only proof:
   - If seq present: starts at 1 and increments by 1.
   - Rolling hash (optional, tamper-evident): H0=0; Hi=SHA256(Hi-1||raw_line_i). Persist last H and line_count externally to detect rewrites.

Rotation (optional)
- If file >5MB, create CONV_LOG_2.jsonl with new Header and {"event":"rotate","previous":"CONV_LOG.jsonl","prev_last_hash":Hn}.

Security & Hygiene
- No secrets/keys in message/evidence. Redact PII. Keep ≤1,200 chars/turn in UI outputs.

PASS Criteria (ST-0302)
- No duplicate signatures; no missing terminal st; append-only verified (seq or rolling-hash + external anchor) without edits.

Example
{"schema":"gg.convlog.v1","append_only":true,"session_id":"GG-SESS-20250819_1405Z","run_id":"72H_20250819_1114Z"}
{"ts":"2025-08-19T14:05:06Z","actor":"system","event":"bt03_start","bt":"BT-03","st":null,"message":"Start BT-03","evidence":"gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63","seq":1}
{"ts":"2025-08-19T14:05:06Z","actor":"system","event":"st0302_start","bt":"BT-03","st":"ST-0302","message":"Begin JSONL append-only logging","evidence":"gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L64-74","seq":2}