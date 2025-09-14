#!/usr/bin/env bash
set -euo pipefail
#
# Create context snapshots (LATEST and/or ARCHIVE).
# Examples:
#   bash scripts/context_snapshot.sh --latest .rules AGENTS.md
#   bash scripts/context_snapshot.sh --archive .rules AGENTS.md
#   bash scripts/context_snapshot.sh --both .rules AGENTS.md status/reports/PROJECT_REBUILD_PROTOCOL.md
#
# Env:
#   SNAPSHOT_LINES (default: 120)
#   CONTEXT_LATEST (default: status/context/CONTEXT_LATEST.md)
#   CONTEXT_ARCHIVE_DIR (default: status/context/snapshots)
#

LINES="${SNAPSHOT_LINES:-120}"
LATEST_PATH="${CONTEXT_LATEST:-status/context/CONTEXT_LATEST.md}"
ARCHIVE_DIR="${CONTEXT_ARCHIVE_DIR:-status/context/snapshots}"
MODE=""

usage() {
  echo "Usage: $0 (--latest | --archive | --both) <paths...>" >&2
  exit 1
}

[[ "$#" -ge 2 ]] || usage
case "$1" in
  --latest|--archive|--both) MODE="$1"; shift ;;
  *) usage ;;
esac

[[ "$#" -ge 1 ]] || usage

ts_utc="$(date -u +%Y-%m-%dT%H:%MZ)"
ts_kst="$(TZ=Asia/Seoul date +%Y-%m-%d' '%H:%M)"

render_md() {
  local out="$1"; shift
  local files=("$@")
  mkdir -p "$(dirname "$out")"
  {
    echo "# Context Snapshot"
    echo "- Timestamp: $ts_utc (UTC) / $ts_kst (KST)"
    echo "- Files:"
    for f in "${files[@]}"; do
      echo "  - $f"
    done
    echo
    for f in "${files[@]}"; do
      if [ -f "$f" ]; then
        echo "## $f"
        echo '```'
        head -n "$LINES" "$f" || true
        echo '```'
        echo
      else
        echo "## $f (missing)"
        echo
      fi
    done
  } > "$out"
  echo "Wrote $out"
}

case "$MODE" in
  --latest)
    render_md "$LATEST_PATH" "$@"
    ;;
  --archive)
    mkdir -p "$ARCHIVE_DIR"
    render_md "$ARCHIVE_DIR/$(date -u +%Y%m%dT%H%MZ).md" "$@"
    ;;
  --both)
    mkdir -p "$ARCHIVE_DIR"
    render_md "$LATEST_PATH" "$@"
    render_md "$ARCHIVE_DIR/$(date -u +%Y%m%dT%H%MZ).md" "$@"
    ;;
esac

