#!/usr/bin/env bash
# ST-1206 — Thread UX v1 demo script
# Add executable demo script for ST-1206 tests (thread append/recent/read, lock, SGM, oversize)
#
# Usage:
#   ./st1206.sh demo
#   ./st1206.sh new
#   ./st1206.sh upgrade-lock <convId>
#   ./st1206.sh lock-conflict <convId>
#   ./st1206.sh block-sgm <convId>
#   ./st1206.sh grounded <convId>
#   ./st1206.sh recent [limit]
#   ./st1206.sh read <convId>
#   ./st1206.sh oversize-text <convId>
#
# Env:
#   BASE=http://localhost:8000   # Backend base URL
#   JQ=jq                        # jq binary or "cat" to bypass pretty print

set -euo pipefail

BASE="${BASE:-http://localhost:8000}"
if command -v "${JQ:-jq}" >/dev/null 2>&1; then
  JQ="${JQ:-jq}"
else
  JQ="cat"
fi

log() { printf "\033[1;34m[ST-1206]\033[0m %s\n" "$*" >&2; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*" >&2; }
ok()  { printf "\033[1;32m[OK]\033[0m %s\n" "$*" >&2; }

new_cid() {
  local day rnd
  day="$(date +%Y%m%d)"
  rnd="$(tr -dc 'a-z0-9' </dev/urandom | head -c 8 || true)"
  printf "gg_%s_%s" "$day" "$rnd"
}

post() {
  local path="$1"; shift
  curl -sS -X POST "$BASE$path" -H 'Content-Type: application/json' --data-binary @- <<<"$*"
}

get() {
  curl -sS "$BASE$1"
}

t_new() {
  local CID
  CID="$(new_cid)"
  log "Creating new thread: $CID"
  post /api/threads/append "$(cat <<EOF
{
  "convId":"$CID",
  "role":"user",
  "text":"첫 메시지입니다. 제목은 이 문장의 앞부분을 사용.",
  "refs":[],
  "meta":{"title":"첫 메시지입니다. 제목은 이 문장의 앞부분…","title_locked":false,"tz_client":"Asia/Seoul"}
}
EOF
)" | $JQ .
  # Try to parse convId from response; fallback to generated
  local parsed
  parsed="$(post /api/threads/append "$(cat <<EOF
{
  "convId":"$CID",
  "role":"assistant",
  "text":"환영 메시지 (테스트용).",
  "refs":[],
  "meta":{}
}
EOF
)" | $JQ -r '.data.convId // empty' 2>/dev/null || true)"
  if [[ -n "$parsed" ]]; then
    CID="$parsed"
  fi
  echo "$CID"
}

t_upgrade_lock() {
  local CID="$1"
  log "Upgrading title & locking: $CID"
  post /api/threads/append "$(cat <<'EOF'
{
  "convId":"__CID__",
  "role":"assistant",
  "text":"이 응답은 충분히 길거나(>=200자) 또는 refs를 포함하여 제목 업그레이드를 트리거합니다. 그러므로 title_locked=true 상태로 업그레이드 후 더 이상 변경되지 않아야 합니다. 참고로 이 문장은 길이를 채우기 위해 추가적인 내용을 포함하고 있습니다. 금강 시스템의 ST-1206 테스트를 위한 더미 텍스트이며 200자를 넘기는 것이 목적입니다. 이렇게 충분히 긴 텍스트는 업그레이드 트리거 조건 중 하나를 만족시킵니다.",
  "refs":["status/checkpoints/CKPT_72H_RUN.md#L1-6"],
  "meta":{"title":"업그레이드된 요약 제목","title_locked":true}
}
EOF
)" | sed "s/__CID__/$CID/g" | $JQ .
}

t_lock_conflict() {
  local CID="$1"
  log "Attempting title change after lock (expect 409): $CID"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/threads/append" -H 'Content-Type: application/json' --data-binary @- <<EOF
{"convId":"$CID","role":"system","text":"제목 변경 시도","refs":[],"meta":{"title":"잠금 이후 변경 시도","title_locked":true}}
EOF
)"
  echo "lock_conflict_status=$code"
  [[ "$code" == "409" ]] && ok "409 TITLE_LOCKED" || err "Expected 409, got $code"
}

t_block_sgm() {
  local CID="$1"
  log "Appending SGM blocked line: $CID"
  post /api/threads/append "$(cat <<EOF
{
  "convId":"$CID",
  "role":"assistant",
  "text":"[SGM: 근거 부족 – 답변 보류]",
  "refs":[],
  "meta":{"sgm_blocked":true,"hint":{"reason":"zero_refs","suggest":["upload files","re-run unified search","narrow query ..."]}}
}
EOF
)" | $JQ .
}

t_grounded_with_ev() {
  local CID="$1"
  log "Appending grounded reply with evidence_path: $CID"
  local day; day="$(date +%Y%m%d)"
  post /api/threads/append "$(cat <<EOF
{
  "convId":"$CID",
  "role":"assistant",
  "text":"근거를 포함한 응답 예시",
  "refs":["status/checkpoints/CKPT_72H_RUN.md#L1-6"],
  "meta":{"evidence_path":"status/evidence/memory/unified_runs/${day}/run_demo.json"}
}
EOF
)" | $JQ .
}

t_recent() {
  local limit="${1:-5}"
  log "Fetching recent (limit=$limit)"
  get "/api/threads/recent?limit=$limit" | $JQ .
}

t_read() {
  local CID="$1"
  log "Reading thread: $CID"
  get "/api/threads/read?convId=$CID" | $JQ .
}

t_oversize_text() {
  local CID="$1"
  log "Posting oversize text (expect 413): $CID"
  local big
  big="$(python - <<'PY'
print("A"*20000)
PY
)"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/threads/append" -H 'Content-Type: application/json' --data-binary @- <<EOF
{"convId":"$CID","role":"user","text":"$big","refs":[],"meta":{}}
EOF
)"
  echo "oversize_text_status=$code"
  [[ "$code" == "413" ]] && ok "413 TEXT_TOO_LARGE" || err "Expected 413, got $code"
}

usage() {
  cat >&2 <<'USAGE'
ST-1206 demo script
Commands:
  demo                               Run end-to-end demo
  new                                Create new thread; prints convId
  upgrade-lock <convId>              Append assistant turn to upgrade & lock title
  lock-conflict <convId>             Attempt to change title after lock (expect 409)
  block-sgm <convId>                 Append SGM blocked line (refs=0)
  grounded <convId>                  Append grounded reply with evidence_path
  recent [limit]                     Show recent threads (default 5)
  read <convId>                      Read entire thread
  oversize-text <convId>             Post oversize text (expect 413)
Env:
  BASE (default http://localhost:8000), JQ (default jq if available, else cat)
USAGE
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    demo)
      local CID
      CID="$(t_new)"
      t_upgrade_lock "$CID" >/dev/null
      t_lock_conflict "$CID"
      t_block_sgm "$CID" >/dev/null
      t_grounded_with_ev "$CID" >/dev/null
      t_recent 5
      t_read "$CID"
      t_oversize_text "$CID"
      ;;
    new)
      t_new
      ;;
    upgrade-lock)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_upgrade_lock "$2"
      ;;
    lock-conflict)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_lock_conflict "$2"
      ;;
    block-sgm)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_block_sgm "$2"
      ;;
    grounded)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_grounded_with_ev "$2"
      ;;
    recent)
      t_recent "${2:-5}"
      ;;
    read)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_read "$2"
      ;;
    oversize-text)
      [[ $# -ge 2 ]] || { err "convId required"; exit 2; }
      t_oversize_text "$2"
      ;;
    ""|-h|--help|help)
      usage
      ;;
    *)
      err "Unknown command: $cmd"
      usage
      exit 2
      ;;
  esac
}

main "$@"
