#!/usr/bin/env bash
set -euo pipefail

TOOL_ID="${1:?Usage: $0 <tool_id> [json_args]}"
JSON_ARGS="${2:-{}}"

VAULT="$HOME/바탕화면/gumgang_0_5/docs/gumgang_2_0"
MEETING_NOTE="$VAULT/금강_회의실.md"
LOG_DIR="$VAULT/금강_로그"
STAMP="$(date '+%Y-%m-%d %H:%M:%S')"
LOG_FILE="$LOG_DIR/${TOOL_ID}_$(date '+%Y%m%d_%H%M%S').json"

RESULT="$(node ./gg_run.js "$TOOL_ID" "$JSON_ARGS")"

printf '%s\n' "$RESULT" > "$LOG_FILE"

{
  echo ""
  echo "### ⏱ $STAMP — $TOOL_ID"
  echo ""
  echo '```json'
  echo "$RESULT"
  echo '```'
} >> "$MEETING_NOTE"

echo "✅ 회의 노트 갱신: $MEETING_NOTE"
echo "🗂  원본 로그: $LOG_FILE"
