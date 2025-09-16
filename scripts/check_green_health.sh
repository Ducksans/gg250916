#!/usr/bin/env bash
set -euo pipefail

# check_green_health.sh — Verify 5175 preview health and last-green sync
# Usage:
#   bash scripts/check_green_health.sh [--json]
# Env:
#   PORT_GREEN (default 5175)
#   CORE_DIR (default exports/gumgang_meeting_core)

PORT="${PORT_GREEN:-5175}"
CORE_DIR="${CORE_DIR:-exports/gumgang_meeting_core}"
PREVIEW_DIR="${CORE_DIR}_last_green"
JSON="${1:-}"

have() { command -v "$1" >/dev/null 2>&1; }

ok() { printf "[ OK ] %s\n" "$*"; }
warn() { printf "[WARN] %s\n" "$*" >&2; }
err() { printf "[FAIL] %s\n" "$*" >&2; }

check_port() {
  if have ss; then
    ss -H -ltnp | awk -v p=":${PORT}" '$4 ~ p {print}' | head -n1
  elif have lsof; then
    lsof -nP -i TCP:${PORT} -sTCP:LISTEN | sed -n '2p'
  elif have netstat; then
    netstat -tulnp 2>/dev/null | awk -v p=":${PORT}" '$0 ~ p {print}' | head -n1
  fi
}

# Return HTTP status code and Location header (no redirect follow, no warnings)
http_code_and_loc() {
  local url="$1"
  local hdr
  hdr="$(curl -sS -o /dev/null -D - "$url" 2>/dev/null || true)"
  local code loc
  code="$(printf '%s' "$hdr" | awk 'NR==1 {print $2}')"
  loc="$(printf '%s' "$hdr" | awk -F': ' '/^Location:/ {print $2}' | tr -d '\r')"
  [ -n "$code" ] || code="000"
  echo "$code ${loc}"
}

json_escape() {
  python3 - <<'PY' 2>/dev/null || printf '%s' "$1"
import json,sys
print(json.dumps(sys.stdin.read().rstrip()))
PY
}

echo "== Green Preview Health Check =="
echo "PORT        : ${PORT}"
echo "CORE_DIR    : ${CORE_DIR}"
echo "PREVIEW_DIR : ${PREVIEW_DIR}"

FAIL=0

# 1) Port open
PORT_DETAIL="$(check_port || true)"
if [ -n "$PORT_DETAIL" ]; then
  ok "port ${PORT} listening"
else
  err "port ${PORT} not listening"
  FAIL=$((FAIL+1))
fi

# 2) Root redirect
read -r CODE LOC <<<"$(http_code_and_loc "http://127.0.0.1:${PORT}/")"
REDIR_OK=false
if [[ "$CODE" =~ ^30[127]$ ]] && [[ "$LOC" == */ui-dev/ || "$LOC" == */ui-dev ]]; then
  ok "root redirects (${CODE}) -> ${LOC}"
  REDIR_OK=true
else
  err "root redirect invalid (code=${CODE}, location='${LOC}')"
  FAIL=$((FAIL+1))
fi

# 3) /ui-dev/ serves
CODE_UI=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/ui-dev/") || CODE_UI=000
if [[ "$CODE_UI" = "200" ]]; then
  ok "/ui-dev/ returns 200"
else
  err "/ui-dev/ returned ${CODE_UI}"
  FAIL=$((FAIL+1))
fi

# 4) last-green sync (with small retry to avoid race)
retry_get_commit() {
  local dir="$1" ref="$2" tries="${3:-5}" delay="${4:-1}" out=""
  for ((i=0; i<tries; i++)); do
    out="$(git -C "$dir" rev-parse "${ref}^{commit}" 2>/dev/null || echo "")"
    if [ -n "$out" ]; then echo "$out"; return 0; fi
    sleep "$delay"
  done
  echo ""
}

REMOTE_COMMIT=""
LOCAL_COMMIT=""
if [ -d "$CORE_DIR/.git" ]; then
  git -C "$CORE_DIR" fetch --tags -q || true
  REMOTE_COMMIT="$(retry_get_commit "$CORE_DIR" "last-green" 5 1)"
fi
if [ -e "$PREVIEW_DIR/.git" ]; then
  LOCAL_COMMIT="$(retry_get_commit "$PREVIEW_DIR" "HEAD" 5 1)"
fi
# Fallback with absolute path (covers relative cwd quirks)
if [ -z "$LOCAL_COMMIT" ]; then
  ABS_PREVIEW="$(realpath -m "$PREVIEW_DIR" 2>/dev/null || echo "$PREVIEW_DIR")"
  if [ -e "$ABS_PREVIEW/.git" ]; then
    LOCAL_COMMIT="$(retry_get_commit "$ABS_PREVIEW" "HEAD" 5 1)"
  fi
fi

SYNC="unknown"
if [ -n "$REMOTE_COMMIT" ] && [ -n "$LOCAL_COMMIT" ]; then
  if [ "$REMOTE_COMMIT" = "$LOCAL_COMMIT" ]; then
    ok "preview synced to last-green (${REMOTE_COMMIT:0:8})"
    SYNC="true"
  else
    warn "preview not yet synced (remote ${REMOTE_COMMIT:0:8} != local ${LOCAL_COMMIT:0:8})"
    SYNC="false"
  fi
else
  warn "cannot resolve commits (remote='${REMOTE_COMMIT}' local='${LOCAL_COMMIT}')"
  SYNC="false"
fi

if [ "$JSON" = "--json" ]; then
  printf '{'
  printf '"port":%s,' "${PORT}"
  printf '"port_open":%s,' "$([ -n "$PORT_DETAIL" ] && echo true || echo false)"
  printf '"redirect_ok":%s,' "$([ "$REDIR_OK" = true ] && echo true || echo false)"
  printf '"ui_ok":%s,' "$([ "$CODE_UI" = 200 ] && echo true || echo false)"
  printf '"last_green_remote":"%s",' "$REMOTE_COMMIT"
  printf '"preview_head":"%s",' "$LOCAL_COMMIT"
  printf '"synced":%s,' "$([ "$SYNC" = "true" ] && echo true || echo false)"
  printf '"ok":%s' "$([ "$FAIL" -eq 0 ] && echo true || echo false)"
  printf '}\n'
fi

echo
if [ "$FAIL" -eq 0 ]; then
  ok "Health check passed"
  exit 0
else
  err "Health check found ${FAIL} issue(s)"
  exit 1
fi
