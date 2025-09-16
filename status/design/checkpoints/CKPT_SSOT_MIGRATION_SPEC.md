---
phase: past
---

# ST-1401 — Checkpoint SSOT Migration Spec (JSONL Hash Chain, UTC Monotonic, Sharding, Concurrency, Hooks, APIs)

Purpose
- Eliminate manual edits on checkpoint logs and guarantee append-only integrity.
- Adopt JSONL hash-chain as SSOT; render read-only MD views for humans.
- Provide a single write ingress (API), with guards for EOF/monotonicity/concurrency.

Scope
- Convert SSOT to JSONL: status/checkpoints/CKPT_72H_RUN.jsonl
- Add optional daily shard support and tail index.
- Implement append/view/tail APIs (server-only writes).
- Enforce guards: file locking, fsync, git hooks, editor read-only.
- Migrate existing .md to view-stub (no deletion/rewrites of history).

Out of Scope
- Retroactive edits of past entries.
- Importing external histories (BT-18+ topic).

Record Model (JSONL; one JSON per line)
- Required fields (client supplies; server validates):
  - run_id: "72H_<YYYYMMDD_HHMM>Z"
  - scope: "CONV|UNIT|TASK|SESSION|PROJECT" or "TASK(BT-14[.PHASE])"
  - decision: string (<= 512 bytes)
  - next_step: string (<= 512 bytes; leading verb)
  - evidence: repo path with optional #Lx-y, within gumgang_meeting/**
- Server-supplied fields:
  - utc_ts: ISO8601Z; server authoritative
  - seq: integer; tie-breaker for same-second arrivals (>=1)
  - prev_hash: 64 hex
  - this_hash: 64 hex
  - writer: "app"|"bridge"|"tool" (audit tag)
- Limits: total line <= 4 KB; evidence path normalized and length <= 512.

Canonicalization & Hash Chain
- Encoding: UTF-8; line endings: LF only; file ends with a single trailing LF.
- Canonical JSON:
  1) String normalization: Unicode NFC for all string values.
  2) Whitespace: minified serialization — no spaces around ":" or ","; no trailing spaces; within strings whitespace is preserved verbatim.
  3) Object keys: sort lexicographically (byte-wise, ascending, ASCII order); apply recursively to all objects.
  4) Numbers: no leading "+", no leading zeros (except "0"), no trailing decimal zeros; emit integer if fractional part is 0; use lowercase "e" exponent only when necessary; "-0" forbidden → "0".
  5) Booleans/null: "true"/"false"/"null" lowercase.
  6) Arrays: preserve element order as provided (no reordering).
- Canonical serialization snippet (pseudo):
  canonical_json = CanonicalSerialize(record_without_hashes_and_writer)
  // ensure UTF-8 bytes and exactly one trailing "\n"
- Hash formula:
  this_hash = SHA256( canonical_json + "\n" + prev_hash )
  // prev_hash is the hex string of the previous line’s this_hash; use 64x"0" for genesis
- Genesis: prev_hash = "0" * 64 on the first line; file must be empty before writing genesis; reject if any pre-existing non-empty content.
- Idempotency:
  - Same (run_id, scope, decision, next_step, evidence) ⇒ same canonical_json ⇒ same this_hash.
  - Server behavior: either (a) reject duplicate with 409 DUP, or (b) accept as no-op (configurable). In both cases monotonicity must still hold.
- Verification:
  - Recompute hash chain by reading file top→bottom; any mismatch fails chain_ok.
  - Monotonic pair (utc_ts, seq) must strictly increase per line.

Monotonic UTC & Sequencing
- Server sets utc_ts (UTC clock). If multiple appends in the same second, assign seq=1..N (monotonic pair: (utc_ts, seq)).
- Validation:
  - (utc_ts, seq) must be strictly greater than the last line’s pair.
  - Reject if client utc_ts provided and it violates monotonicity; preserve as client_utc_ts (optional audit-only).

Concurrency & Durability
- Exclusive append lock: OS file lock (fcntl) around an O_APPEND write.
- Write order: acquire lock → read tail → validate → write(line+"\n") → fsync → release lock.
- Crash-safety: fsync before unlock; on partial write detection (non-JSON tail), quarantine tail and stop writes with 503 until operator fix.

Sharding & Layout
- Primary: status/checkpoints/CKPT_72H_RUN.jsonl (append-only).
- Optional daily shard (recommended as file grows):
  - status/checkpoints/jsonl/YYYY-MM-DD.jsonl (append-only)
  - status/checkpoints/index/tail.idx (JSON with last {file, offset, hash, utc_ts, seq})
- View MD (generated, read-only):
  - status/checkpoints/daily/YYYY-MM-DD.md

APIs (server)
- POST /api/checkpoints/append
  - Body: { run_id, scope, decision, next_step, evidence, idempotency_key? }
  - Server sets utc_ts, seq, prev_hash, this_hash, writer.
  - 201 Created: returns stored record.
  - 409 NON_EOF: file changed during validation; retry.
  - 409 DUP: identical this_hash already at tail.
  - 422 TS_NOT_MONOTONIC | 422 FIELDS_MISSING | 422 INVALID_EVIDENCE_PATH
  - 429 RATE_LIMIT, 401/403 authz failures
- GET /api/checkpoints/view?date=YYYY-MM-DD&fmt=md|json
  - Source: JSONL (primary or shard).
  - Returns: rendered MD (6-line blocks) or JSON array for the date.
  - MD includes “효력은 EOF 기준” badge and correction grouping.
- GET /api/checkpoints/tail?n=50
  - Returns: last N records in reverse time order, plus chain_status, last_hash, last_ts, last_seq.

Security & Policy
- Authentication: local token or IPC; restrict to localhost by default.
- Rate limit: sliding window per writer/idempotency_key.
- Evidence path normalization: must reside under gumgang_meeting/**; reject absolute/external.
- PII_STRICT: payloads cannot include secrets; evidence should not contain content, only path/#Lx-y.

Editor & Git Guards
- CKPT_72H_RUN.md becomes view-stub with:
  - “GENERATED — DO NOT EDIT. View-only; source: CKPT_72H_RUN.jsonl”
  - Latest daily view link(s).
- pre-commit: block staged changes to status/checkpoints/CKPT_72H_RUN.md
- pre-push: run scripts/ckpt_lint.py → verify:
  - JSONL parsable, chain intact, (utc_ts,seq) monotonic, evidence within root.
- Editor guard: project settings mark read-only paths:
  - status/checkpoints/CKPT_72H_RUN.md
  - status/checkpoints/daily/**
- Bridge/UI: read-only “safe=1” viewer; input/shortcuts disabled.

Validation Tool (ckpt_lint.py)
- Checks: JSON decode, canonical re-hash, chain continuity, monotonicity.
- Reports: {chain_ok, breaks:[], last_hash, last_ts, last_seq, counts:{lines,days}}
- Exit codes: 0 OK, 2 CHAIN_BREAK, 3 MONOTONIC_FAIL, 4 IO_ERROR.

Migration Plan
1) Freeze: stop manual edits on CKPT_72H_RUN.md.
2) Create CKPT_72H_RUN.jsonl (if absent); do not backfill; future entries only.
3) Replace CKPT_72H_RUN.md with generated stub (keep history untouched).
4) Install pre-commit/pre-push hooks; add editor read-only config.
5) Deploy append/view/tail APIs; point UI(A6 Checkpoints) to view API.
6) Announce: “From now on, only POST /api/checkpoints/append may write.”

Acceptance Criteria
- Any attempt to edit .md is blocked at commit; push without chain integrity is blocked.
- New entries only via POST append; JSONL shows continuous prev→this hash chain.
- Monotonic (utc_ts, seq) holds; tail endpoint returns 50 newest with chain_status=OK.
- A6 Checkpoints renders daily MD in ≤1.5s; shows EOF-based validity badge.

Examples

Request/Response Shapes
- Append Request (client → server)
  {
    "run_id": "72H_20250821_1201Z",
    "scope": "TASK(BT-14.PHASE1)",
    "decision": "ST-1401 스펙 확정",
    "next_step": "백엔드 구현 v1 착수",
    "evidence": "gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60",
    "idempotency_key": "uuid-optional"
  }
- Append Response 201 (server → client)
  {
    "run_id": "72H_20250821_1201Z",
    "utc_ts": "2025-08-21T12:01:00Z",
    "seq": 1,
    "scope": "TASK(BT-14.PHASE1)",
    "decision": "ST-1401 스펙 확정",
    "next_step": "백엔드 구현 v1 착수",
    "evidence": "gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60",
    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
    "this_hash": "5b0f...<64hex>",
    "writer": "app"
  }

Error Codes (Summary)
- 201 Created — 성공, 저장된 레코드 반환
- 401 Unauthorized / 403 Forbidden — 인증/권한 실패
- 409 NON_EOF — 검증 후 파일 변경 감지(경합); 재시도 필요
- 409 DUP — 동일 payload 해시가 이미 tail에 존재(멱등 충돌)
- 422 FIELDS_MISSING — 필수 입력 누락
- 422 INVALID_EVIDENCE_PATH — 루트 밖 경로/형식 위반
- 422 TS_NOT_MONOTONIC — 단조 (utc_ts, seq) 조건 위반(클라이언트 힌트 기준)
- 429 RATE_LIMIT — 요청 과다
- 500 INTERNAL / 503 READONLY_OR_CORRUPT — 서버 오류/체인 손상으로 쓰기 차단

cURL Examples
- Success
  curl -sS -X POST http://127.0.0.1:8000/api/checkpoints/append \
    -H "Content-Type: application/json" \
    -d '{"run_id":"72H_20250821_1201Z","scope":"TASK(BT-14.PHASE1)","decision":"ST-1401 스펙 확정","next_step":"백엔드 구현 v1 착수","evidence":"gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60"}'
- Duplicate (409 DUP)
  curl -sS -X POST ... -d '{same as above}'
- Monotonic fail (422 TS_NOT_MONOTONIC)
  curl -sS -X POST ... -d '{"run_id":"72H_20250821_1100Z", ... }'

JSONL Line (stored)
  {"run_id":"72H_20250821_1152Z","utc_ts":"2025-08-21T11:52:00Z","seq":1,"scope":"TASK(BT-14)","decision":"BT-14 범위 명확화 — Phase 1 선행 후 Phase 2 완료","next_step":"ST-1401 스펙 재정의 후 Phase 1 진입","evidence":"gumgang_meeting/status/roadmap/BT11_to_BT21_Compass_ko.md#L1-60","prev_hash":"0000000000000000000000000000000000000000000000000000000000000000","this_hash":"<64hex>","writer":"app"}

View (MD excerpt)
  RUN_ID: 72H_20250821_1152Z
  UTC_TS: 2025-08-21T11:52:00Z (seq:1)
  SCOPE: TASK(BT-14)
  DECISION: BT-14 범위 명확화 — Phase 1 선행 후 Phase 2 완료
  NEXT STEP: ST-1401 스펙 재정의 후 Phase 1 진입
  EVIDENCE: gumgang_meeting/status/roadmap/BT11_to_BT21_Compass_ko.md#L1-60

Tail (JSON excerpt)
  {
    "chain_status": "OK",
    "last_hash": "5b0f...<64hex>",
    "last_ts": "2025-08-21T12:01:00Z",
    "last_seq": 1,
    "items": [
      {"run_id":"72H_20250821_1201Z","utc_ts":"2025-08-21T12:01:00Z","seq":1,"scope":"TASK(BT-14.PHASE1)","decision":"ST-1401 스펙 확정","next_step":"백엔드 구현 v1 착수","evidence":"gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60","this_hash":"5b0f..."}
    ]
  }

Notes
- View renderer must trust JSONL EOF order only; if historical mid-file insertions exist in .md, they are ignored except for shown “corrections” grouping.

Change Log
- v0.1 (BT-14 ST-1401): Initial spec draft (hash-chain, monotonic UTC, sharding, concurrency, hooks, APIs).