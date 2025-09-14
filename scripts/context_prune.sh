#!/usr/bin/env bash
set -euo pipefail
#
# Prune archived context snapshots by days and/or max count.
# Usage:
#   bash scripts/context_prune.sh [dir] [retain_days] [retain_max]
# Defaults:
#   dir: status/context/snapshots
#   retain_days: 30
#   retain_max: 60
#

DIR="${1:-status/context/snapshots}"
RETAIN_DAYS="${2:-30}"
RETAIN_MAX="${3:-60}"

mkdir -p "$DIR"
echo "Pruning in $DIR (days<=$RETAIN_DAYS, max<=$RETAIN_MAX)"

# Delete files older than RETAIN_DAYS
if [ -n "$RETAIN_DAYS" ] && [ "$RETAIN_DAYS" -gt 0 ]; then
  find "$DIR" -type f -name '*.md' -mtime +"$RETAIN_DAYS" -print -delete || true
fi

# Enforce RETAIN_MAX by removing oldest beyond limit
count=$(ls -1t "$DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$count" -gt "$RETAIN_MAX" ]; then
  excess=$((count - RETAIN_MAX))
  echo "Removing $excess oldest files to enforce max=$RETAIN_MAX"
  ls -1tr "$DIR"/*.md 2>/dev/null | head -n "$excess" | xargs -r rm -f
fi

echo "Prune done."

