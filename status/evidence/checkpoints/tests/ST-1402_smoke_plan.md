# ST-1402 — Checkpoints API Smoke Test Plan (Round-trip + Integrity)

Purpose
- Verify JSONL SSOT append/view/tail round-trip works and preserves integrity.
- Confirm hash-chain continuity, server-UTC monotonicity(+seq), and evidence path validation.
- Produce reproducible, append-only evidence without any destructive steps.

Scope
- Backend endpoints (FastAPI):
  - POST /api/checkpoints/append
  - GET  /api/checkpoints/view?date=YYYY-MM-DD&fmt=md|json
  - GET  /api/checkpoints/tail?n=50
- File targets (append-only):
  - status/checkpoints/CKPT_72H_RUN.jsonl

Notes (current implementation deviations vs spec)
- append returns HTTP 200 with {"ok":true,...} (not 201). Treat 200 as success in this smoke.
- Server is the sole time authority; client does not send utc_ts → TS_NOT_MONOTONIC case is not applicable here.

Preconditions
- Backend running locally (uvicorn app.api:app --port 8000).
- WRITE_ALLOW covers status/checkpoints/** (as per .rules v3.0).
- CKPT_72H_RUN.jsonl exists or is creatable by the server process.
- You have curl/jq available for quick assertions.

Environment (suggested shell vars)
- BASE=http://127.0.0.1:8000
- TODAY=$(date -u +%F)              # e.g., 2025-08-21
- RID_A=72H_$(date -u +%Y%m%d_%H%M)Z # unique run_id example
- RID_B=72H_$(date -u +%Y%m%d_%H%M)Z # second run_id for rapid append
- EVID="gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60"

Artifacts (optional capture; do not pre-create)
- status/evidence/checkpoints/tests/out/health.json
- status/evidence/checkpoints/tests/out/tail_before.json
- status/evidence/checkpoints/tests/out/append_A.json
- status/evidence/checkpoints/tests/out/view_today.json
- status/evidence/checkpoints/tests/out/tail_after.json
- status/evidence/checkpoints/tests/out/append_dup.json
- status/evidence/checkpoints/tests/out/append_invalid_path.json

Test Cases

1) Health sanity
- Step:
  curl -sS "$BASE/api/health" | tee health.json
- Expect:
  - JSON with ok=true and routes.checkpoints? (not required) and ts present.
  - Not a blocker if checkpoints not listed; only used to confirm server is up.

2) Tail (before)
- Step:
  curl -sS "$BASE/api/checkpoints/tail?n=5" | tee tail_before.json
- Expect:
  - ok=true
  - chain_status either "OK" (or "FAIL" only if legacy corruption; should be "OK")
  - last_hash (64 hex) if any item exists, else null
  - items is an array (0..5)
- Record last_hash_before, last_ts_before, last_seq_before for later comparison.

3) Append success (A)
- Payload:
  {
    "run_id": "$RID_A",
    "scope": "TASK(BT-14.PHASE1)",
    "decision": "ST-1402 SMOKE — append A",
    "next_step": "view/tail 검증",
    "evidence": "$EVID"
  }
- Step:
  curl -sS -X POST "$BASE/api/checkpoints/append" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$RID_A\",\"scope\":\"TASK(BT-14.PHASE1)\",\"decision\":\"ST-1402 SMOKE — append A\",\"next_step\":\"view/tail 검증\",\"evidence\":\"$EVID\"}" \
    | tee append_A.json
- Expect (HTTP 200):
  - ok=true
  - data.run_id == $RID_A
  - data.this_hash length 64; data.prev_hash length 64 (or 64*'0' if genesis)
  - data.utc_ts in ISO8601Z; data.seq >= 1
  - data.writer == "app"

4) View (today, md)
- Step:
  curl -sS "$BASE/api/checkpoints/view?date=$TODAY&fmt=md" | tee view_today.json
- Expect:
  - ok=true
  - view string contains:
    - "RUN_ID: $RID_A"
    - "EVIDENCE: $EVID"
  - meta.chain_ok == true

5) Tail (after append A)
- Step:
  curl -sS "$BASE/api/checkpoints/tail?n=5" | tee tail_after.json
- Expect:
  - ok=true, chain_status=="OK"
  - items[0].run_id == $RID_A (latest first)
  - last_hash != last_hash_before (unless file was empty before; then just non-empty now)
  - last_ts >= last_ts_before (lexicographically; Zulu time)
  - seq rule:
    - If last_ts_before == items[0].utc_ts → items[0].seq > last_seq_before
    - Else → items[0].seq == 1

6) Duplicate append detection (A again)
- Step:
  curl -sS -X POST "$BASE/api/checkpoints/append" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$RID_A\",\"scope\":\"TASK(BT-14.PHASE1)\",\"decision\":\"ST-1402 SMOKE — append A\",\"next_step\":\"view/tail 검증\",\"evidence\":\"$EVID\"}" \
    -o append_dup.json -w "%{http_code}\n"
- Expect:
  - HTTP 409
  - Body detail "DUP" (server raises 409 DUP)

7) Evidence path validation (invalid)
- Payload evidence: "/etc/passwd" (absolute path)
- Step:
  curl -sS -X POST "$BASE/api/checkpoints/append" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$RID_B\",\"scope\":\"TASK(BT-14.PHASE1)\",\"decision\":\"ST-1402 SMOKE — invalid evidence\",\"next_step\":\"n/a\",\"evidence\":\"/etc/passwd\"}" \
    -o append_invalid_path.json -w "%{http_code}\n"
- Expect:
  - HTTP 422
  - detail "INVALID_EVIDENCE_PATH"
- Post-check tail unchanged (optional):
  curl -sS "$BASE/api/checkpoints/tail?n=1" | jq .

8) Rapid double append (seq check) — optional
- Step:
  - Append B1 with $RID_B (decision "... append B1")
  - Immediately append B2 with $RID_B+"_2" (decision "... append B2")
- Expect:
  - If both land within the same UTC second:
    - tail.items[0].utc_ts == tail.items[1].utc_ts
    - tail.items[0].seq == tail.items[1].seq + 1 (reverse order display)
  - If different seconds: seq resets to 1 for the later second.

Assertions (summary checklist)
- [ ] Tail before → ok=true, chain_status in {"OK", null on empty}, structure valid
- [ ] Append A → ok=true; data.this_hash 64 hex; writer="app"
- [ ] View today → contains RUN_ID/EVIDENCE for RID_A; meta.chain_ok=true
- [ ] Tail after → latest == RID_A; chain_status="OK"; last_hash advanced
- [ ] Duplicate → HTTP 409, detail "DUP"
- [ ] Invalid evidence → HTTP 422, detail "INVALID_EVIDENCE_PATH"
- [ ] (Optional) Rapid double append → seq behavior matches spec

Pass Criteria
- All mandatory assertions checked.
- Chain status remains "OK" after all operations.
- No server 5xx/503 READONLY_OR_CORRUPT responses encountered.

Safety/Rollback
- This plan is append-only; no destructive steps. No rollback needed.
- If chain status ever reports FAIL, stop further appends and file a CORRECTION entry via normal process after investigation.

Appendix — Quick jq snippets
- Extract latest item:
  jq '.items[0]'
- Validate hash length (example):
  jq -r '.data.this_hash' append_A.json | awk 'length($0)==64'

Change Log
- v0.1 (BT-14 ST-1402): Initial smoke test plan for checkpoints API and integrity.