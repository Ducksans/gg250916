#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# timestamp: 2025-09-16T18:18Z (UTC) / 2025-09-17 03:18 (KST)
# author: Codex (AI Agent)
# summary: ST0103 쓰레드 import 증거 수집 러너(드라이런 지원)
# document_type: ci_script
# tags: #st0103 #runner #evidence
# DOCS_TIME_SPEC: GG_TIME_SPEC_V1
# -----------------------------------------------------------------------------
set -euo pipefail

# ST0103 — Thread Import Runner
# Usage:
#   scripts/ci/st0103_import_runner.sh [--dry-run] [--backend fastapi|bridge|relative] [--host URL] [--limit N]
# Defaults:
#   backend=relative ("/api" or "/bridge/api" must be handled by host server/proxy)
#   host=http://localhost:5175 (Vite preview/dev proxy), limit=50
#
# Outputs evidence files under: status/evidence/ui/

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVI_DIR="$ROOT_DIR/status/evidence/ui"
LOG_PREFIX="$(date -u +%Y%m%dT%H%MZ)"
OUT_LOG="$EVI_DIR/thread_import_${LOG_PREFIX}.log"
OUT_JSON="$EVI_DIR/thread_import_${LOG_PREFIX}.json"
CKPT_FILE="$ROOT_DIR/status/checkpoints/CKPT_72H_RUN.jsonl"

DRY_RUN=false
BACKEND="relative"   # fastapi|bridge|relative
HOST="http://localhost:5175"
LIMIT=50

usage(){
  cat <<USAGE
ST0103 Thread Import Runner
Usage: $(basename "$0") [--dry-run] [--backend fastapi|bridge|relative] [--host URL] [--limit N]

--dry-run   Show planned curl commands only.
--backend   Choose API base: fastapi (/api), bridge (/bridge/api), or relative (default).
--host      Base host for curl (default: http://localhost:5175).
--limit     Max threads to fetch from 'recent' (default: 50).
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift;;
    --backend) BACKEND="${2:-relative}"; shift 2;;
    --host) HOST="${2:-http://localhost:5175}"; shift 2;;
    --limit) LIMIT="${2:-50}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "[WARN] Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

mkdir -p "$EVI_DIR"

case "$BACKEND" in
  fastapi) API_BASE="/api";;
  bridge)  API_BASE="/bridge/api";;
  relative) API_BASE="/api";;
  *) echo "[ERR] invalid --backend: $BACKEND" >&2; exit 2;;
esac

RECENT_URL="${HOST%/}${API_BASE}/threads/recent?limit=${LIMIT}"

echo "[STEP] Fetch recent threads => $RECENT_URL" | tee "$OUT_LOG"
if "$DRY_RUN"; then
  echo "[DRY-RUN] curl -sfSL '$RECENT_URL'" | tee -a "$OUT_LOG"
  echo '{"status":"dry-run"}' >"$OUT_JSON"
  exit 0
fi

set +e
RECENT_JSON=$(curl -sfSL "$RECENT_URL")
EC=$?
set -e

if [[ $EC -ne 0 || -z "$RECENT_JSON" ]]; then
  echo "[FAIL] recent fetch failed (exit $EC)" | tee -a "$OUT_LOG"
  echo '{"ok":false,"error":"recent_fetch_failed"}' >"$OUT_JSON"
  exit 3
fi

echo "$RECENT_JSON" | jq . | tee -a "$OUT_LOG" >/dev/null || true

# Extract up to 10 IDs to sample read
IDS=$(echo "$RECENT_JSON" | jq -r '.data.items[] | (.convId // .id // .conversation_id // empty)' 2>/dev/null | head -n 10)
IMPORTED=0
FAILED=0

for id in $IDS; do
  enc_id=$(python3 - "$id" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1]))
PY
)
  READ_URL="${HOST%/}${API_BASE}/threads/read?convId=${enc_id}"
  echo "[STEP] Read thread id=$id => $READ_URL" | tee -a "$OUT_LOG"
  set +e
  READ_JSON=$(curl -sfSL "$READ_URL")
  RC=$?
  set -e
  if [[ $RC -ne 0 || -z "$READ_JSON" ]]; then
    echo "[WARN] read failed for id=$id (exit $RC)" | tee -a "$OUT_LOG"
    FAILED=$((FAILED+1))
    continue
  fi
  # Summarize turns count for evidence
  TURNS=$(echo "$READ_JSON" | jq -r '(.data.turns // .turns // []) | length' 2>/dev/null || echo 0)
  echo "[OK] id=$id turns=$TURNS" | tee -a "$OUT_LOG"
  IMPORTED=$((IMPORTED+1))
done

cat >"$OUT_JSON" <<JSON
{
  "ok": true,
  "host": "$HOST",
  "api_base": "$API_BASE",
  "sampled": $(echo "$IDS" | wc -w | tr -d ' '),
  "imported": $IMPORTED,
  "failed": $FAILED,
  "evidence_log": "$(basename "$OUT_LOG")"
}
JSON

echo "[SUMMARY] sampled=$(echo "$IDS" | wc -w) imported=$IMPORTED failed=$FAILED" | tee -a "$OUT_LOG"

echo "[DONE] Evidence: $OUT_LOG, $OUT_JSON"
exit 0
