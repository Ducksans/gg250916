#!/usr/bin/env bash
set -euo pipefail

BASE="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT="$BASE/docs/gumgang_2_0"
COOLDOWN="${COOLDOWN:-15}"   # 연속 변경 시 최소 간격(초)
LAST_FILE="$BASE/.gg_watch_lastrun"

command -v inotifywait >/dev/null 2>&1 || { echo "❌ inotify-tools 필요: sudo apt-get install -y inotify-tools" >&2; exit 1; }

last_run=0
[ -f "$LAST_FILE" ] && last_run="$(cat "$LAST_FILE" || echo 0)"

# 회의노트/로그, .git, node_modules 등은 감시에서 제외 (무한루프 방지)
EXCLUDE='(/\.git/|/node_modules/|/__pycache__/|/docs/gumgang_2_0/)'

echo "[gg_watcher] watching: $BASE  (cooldown=${COOLDOWN}s, exclude=${EXCLUDE})"
inotifywait -m -r \
  -e close_write,create,delete,move \
  --format '%w%f %e' \
  --exclude "$EXCLUDE" \
  "$BASE" | while read -r path event; do
    now="$(date +%s)"
    if (( now - last_run >= COOLDOWN )); then
      echo "[gg_watcher] change: $event $path"
      "$BASE/gg.sh" scan || echo "[gg_watcher] gg.sh scan 실패" >&2
      last_run="$now"
      echo "$last_run" > "$LAST_FILE"
    fi
  done
