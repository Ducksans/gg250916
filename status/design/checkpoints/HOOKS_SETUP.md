---
phase: past
---

# Hooks Setup — Checkpoint Guards (BT-14 ST-1403)

Purpose
- Prevent accidental edits to the human-readable stub `status/checkpoints/CKPT_72H_RUN.md`.
- Enforce append-only, hash-chain, and UTC monotonicity for the SSOT file `status/checkpoints/CKPT_72H_RUN.jsonl`.
- Provide consistent local checks before commit/push; mirrorable in CI.

Scope
- Git hooks: pre-commit (mandatory), pre-push (recommended)
- Linter: `scripts/ckpt_lint.py` (hash-chain + monotonic UTC + evidence path policy)
- Read-only stub policy for the `.md` view

Prerequisites
- Git ≥ 2.30
- Python ≥ 3.9 (3.11+ recommended)
- Bash (Git Bash on Windows is OK)
- Optional: `jq` for nicer JSON checks (scripts below degrade gracefully without it)

Guarded Files and Rules
- Do NOT edit directly (blocked):
  - `gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md`
  - `gumgang_meeting/status/checkpoints/daily/**` (generated views)
- SSOT only writes via API:
  - `POST /api/checkpoints/append`
- Lint target:
  - `gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl`
- Policy:
  - Append-only
  - Hash-chain: `this_hash = SHA256(canonical(core) + "\n" + prev_hash)`
  - Monotonic `(utc_ts, seq)` strictly increasing
  - Evidence path must be under `gumgang_meeting/**`

Quick Setup (choose one)

Option A — Use repository-managed hooks path (recommended)
1) Set Git to use repo scripts as hooks:
   git config core.hooksPath scripts/hooks
2) Create scripts/hooks/ and place the hook files below as:
   - `scripts/hooks/pre-commit`
   - `scripts/hooks/pre-push`
3) Make them executable:
   chmod +x scripts/hooks/pre-commit scripts/hooks/pre-push

Option B — Install to .git/hooks (local only)
- Copy the hook files below into `.git/hooks/`, same filenames, then:
  chmod +x .git/hooks/pre-commit .git/hooks/pre-push

Pre-commit hook (block MD edits + lint JSONL)
Put this into scripts/hooks/pre-commit (or .git/hooks/pre-commit):

#!/usr/bin/env bash
set -euo pipefail

# Paths
ROOT="gumgang_meeting"
CKPT_MD="$ROOT/status/checkpoints/CKPT_72H_RUN.md"
CKPT_JSONL="$ROOT/status/checkpoints/CKPT_72H_RUN.jsonl"
LINT="scripts/ckpt_lint.py"

warn() { printf "pre-commit: %s\n" "$*" >&2; }
fail() { warn "$*"; exit 1; }

# 1) Block staged edits to the MD stub and generated daily views
CHANGED=$(git diff --name-only --cached || true)
if echo "$CHANGED" | grep -qx "$CKPT_MD"; then
  fail "Blocked: $CKPT_MD is view-only. Use POST /api/checkpoints/append. Unstage your changes."
fi
if echo "$CHANGED" | grep -q "^$ROOT/status/checkpoints/daily/"; then
  fail "Blocked: daily views are generated artifacts. Do not commit direct edits."
fi

# 2) Run JSONL lint (chain + monotonic); tolerate missing file (empty)
if [ -f "$LINT" ]; then
  PYTHON=${PYTHON:-python3}
  if ! $PYTHON "$LINT" --path "$CKPT_JSONL" --format json --max-lines 200000 --quiet; then
    # Print a short report for context
    warn "Checkpoint lint failed. Report:"
    $PYTHON "$LINT" --path "$CKPT_JSONL" --format md || true
    fail "Fix checkpoint issues or revert before committing."
  fi
else
  warn "Missing $LINT; skipping lint. Add scripts/ckpt_lint.py to enable strong guard."
fi

exit 0

Pre-push hook (stronger lint; optional server probe)
Put this into scripts/hooks/pre-push (or .git/hooks/pre-push):

#!/usr/bin/env bash
set -euo pipefail

ROOT="gumgang_meeting"
CKPT_JSONL="$ROOT/status/checkpoints/CKPT_72H_RUN.jsonl"
LINT="scripts/ckpt_lint.py"

warn() { printf "pre-push: %s\n" "$*" >&2; }
fail() { warn "$*"; exit 1; }

PYTHON=${PYTHON:-python3}
# 1) Strong lint: fail on evidence path issues, if linter present
if [ -f "$LINT" ]; then
  if ! $PYTHON "$LINT" --path "$CKPT_JSONL" --fail-on-evidence --format json --max-lines 200000 --quiet; then
    warn "Strong lint failed. Summary:"
    $PYTHON "$LINT" --path "$CKPT_JSONL" --fail-on-evidence --format md || true
    fail "Checkpoint integrity/policy check failed. Push aborted."
  fi
else
  warn "Missing $LINT; skipping lint."
fi

# 2) Optional: lightweight server probe (non-blocking)
BASE="${CKPT_API_BASE:-http://127.0.0.1:8000}"
if command -v curl >/dev/null 2>&1; then
  if curl -sS "$BASE/api/health" >/dev/null 2>&1; then
    warn "Server health OK ($BASE)."
  else
    warn "Server not reachable; skipping health probe."
  fi
fi

exit 0

Usage Notes
- Bypass (emergency only): `git commit --no-verify` or `GIT_ALLOW_UNGUARDED=1` (if you add support).
  - Any bypass must be followed by an EOF CORRECTION checkpoint entry explaining the reason.
- Linter output formats:
  - JSON (default in hooks for machine checks)
  - MD (human-readable summary for troubleshooting)
- Lint performance:
  - `--max-lines` guards runaway sizes; tune if your JSONL grows large.
- Editor guard (optional, complements hooks):
  - Configure your editor to mark read-only:
    - `status/checkpoints/CKPT_72H_RUN.md`
    - `status/checkpoints/daily/**`
  - Zed example (project settings) — read_only_paths:
    {
      "read_only_paths": [
        "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md",
        "gumgang_meeting/status/checkpoints/daily/**"
      ]
    }

Operational Guarantees (pass criteria)
- Pre-commit blocks any MD stub edits and fails if JSONL hash-chain or monotonicity breaks.
- Pre-push additionally fails on invalid evidence paths and produces a short report.
- New checkpoint entries are added only via `POST /api/checkpoints/append`.
- The `.md` file remains a view-stub; daily views are generated, not hand-edited.

Troubleshooting
- “HASH_MISMATCH” / “PREV_LINK_MISMATCH”:
  - Stop appends; investigate the last few lines of JSONL; repair requires a controlled CORRECTION process.
- “UTC_TS_REGRESSED” / “SEQ_NOT_INCREASING”:
  - Check system clock; ensure same-second entries increment `seq`.
- “INVALID_EVIDENCE_PATH”:
  - Ensure evidence points under `gumgang_meeting/**` and includes optional `#Lx-y`.
- Missing linter:
  - Add `scripts/ckpt_lint.py` from this repo; make sure `python3` is available.

References
- Spec: `status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md`
- Linter: `scripts/ckpt_lint.py`
- API: `app/api.py` — `/api/checkpoints/append|view|tail`

Change Log
- v1 (BT-14 ST-1403): Initial hooks setup and usage guide.