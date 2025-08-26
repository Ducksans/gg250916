#!/usr/bin/env bash
# gg.sh — GumGang ↔ Obsidian 연동 실행기
# 사용:
#   ./gg.sh scan
#   ./gg.sh read /절대/경로/파일.txt   # 인자 생략 시 requirements.txt 기본

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# 환경 안전 가드 (Obsidian 플러그인 환경에서 HOME이 비어있는 경우 대비)
# ─────────────────────────────────────────────────────────────
if [ -z "${HOME:-}" ]; then
  if command -v getent >/dev/null 2>&1; then
    HOME="$(getent passwd "$(id -un)" | cut -d: -f6 || true)"
  fi
  HOME="${HOME:-/home/${USER:-duksan}}"
  export HOME
fi

# 스크립트 루트 기준 경로 고정 (이 파일이 있는 곳이 gumgang_0_5 루트)
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$SCRIPT_DIR"

# Obsidian 보관함 경로
VAULT="$BASE/docs/gumgang_2_0"
MEETING_NOTE="$VAULT/금강_회의실.md"
LOG_DIR="$VAULT/금강_로그"

mkdir -p "$LOG_DIR"

# 기본 읽기 대상(인자 없을 때)
DEFAULT_REQ_FILE="$BASE/backend/requirements.txt"

stamp() { date '+%Y-%m-%d %H:%M:%S'; }

append_to_meeting() {
  local title="$1" ; shift
  local result_json="$1" ; shift

  local ts="$(stamp)"
  local log_file="$LOG_DIR/${title}_$(date '+%Y-%m-%d_%H-%M-%S').json"

  printf '%s\n' "$result_json" > "$log_file"

  {
    echo ""
    echo "### ⏱ $ts — $title"
    echo ""
    echo '```json'
    echo "$result_json"
    echo '```'
  } >> "$MEETING_NOTE"

  echo "✅ 회의 노트 갱신: $MEETING_NOTE"
  echo "🗂  원본 로그: $log_file"
}

die() { echo "❌ $*" >&2; exit 1; }

cmd="${1:-}"

case "$cmd" in
  scan)
    # 전체 디렉터리 1-뎁스 스캔 → 회의 노트에 JSON 첨부
    RESULT="$(node "$BASE/gg_run.js" gg_full_scan "{\"path\":\"$BASE\"}")"
    append_to_meeting "full_scan" "$RESULT"
    ;;

  read)
    # 특정 파일 읽기(인자 있으면 그 경로, 없으면 기본 requirements.txt)
    TARGET="${2:-$DEFAULT_REQ_FILE}"
    [ -f "$TARGET" ] || die "파일이 없습니다: $TARGET"

    # gg_run.js의 텍스트 읽기 툴 호출
    # (툴 id: gg_read_text, 인자: {"path":"..."} )
    # JSON 내부의 따옴표 이스케이프 주의
    ESCAPED_PATH="$(printf '%s' "$TARGET" | sed 's/"/\\"/g')"
    RESULT="$(node "$BASE/gg_run.js" gg_read_text "{\"path\":\"$ESCAPED_PATH\"}")"
    append_to_meeting "read_text" "$RESULT"
    ;;

  *)
    cat <<USAGE
사용법:
  ./gg.sh scan
  ./gg.sh read /절대/경로/파일.txt   # 생략 시: $DEFAULT_REQ_FILE
USAGE
    exit 2
    ;;
esac
