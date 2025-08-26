#!/usr/bin/env bash
# install_cron_st1205.sh — Register daily cron jobs for ST-1205 eval and trend
#
# What this does
# - Adds two cron entries (idempotent):
#   1) Daily eval (ST-1205 ON/OFF set) → writes set_eval/<day>/set_eval_<day>.json
#   2) 7-day trend card → writes set_eval/trends/trend_{start}_{end}.json (+ trend_latest.json)
#
# Defaults
# - Eval run time : 09:00 (local)
# - Trend run time: 09:10 (local)
# - Python binary : python
#
# Usage
#   bash gumgang_meeting/scripts/install_cron_st1205.sh --install                # install (default)
#   bash gumgang_meeting/scripts/install_cron_st1205.sh --uninstall              # remove entries
#   bash gumgang_meeting/scripts/install_cron_st1205.sh --show                   # show current cron
#   bash gumgang_meeting/scripts/install_cron_st1205.sh --install --eval-time 08:30 --trend-time 08:40 --python python3
#
# Output (logs)
# - status/logs/st1205_eval.cron.log
# - status/logs/st1205_trend.cron.log
#
# Safety
# - Idempotent: re-running --install updates/replaces this project's entries only.
# - Uses unique markers with a project-root key.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

# -------- Utilities --------

die() { echo "[install_cron_st1205] ERROR: $*" >&2; exit 1; }
note() { echo "[install_cron_st1205] $*"; }

need_bin() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

# Create safe key from project root (no spaces/utf for marker suffix)
safe_key() {
  # hex of sha1(project_root) trimmed
  python - "$PROJECT_ROOT" <<'PY' 2>/dev/null || echo "proj"
import hashlib, sys
root=sys.argv[1].encode("utf-8")
print(hashlib.sha1(root).hexdigest()[:12])
PY
}

# HH:MM → "M H * * *"
to_cron_time() {
  local hhmm="$1"
  if [[ ! "$hhmm" =~ ^([0-2][0-9]):([0-5][0-9])$ ]]; then
    die "Invalid time format: $hhmm (expected HH:MM)"
  fi
  local H="${BASH_REMATCH[1]}"
  local M="${BASH_REMATCH[2]}"
  # normalize hours 00-23
  if ((10#$H > 23)); then die "Hour out of range (00-23): $H"; fi
  echo "$((10#$M)) $((10#$H)) * * *"
}

# -------- Defaults / Args --------

MODE="install"            # install | uninstall | show
EVAL_TIME="09:00"
TREND_TIME="09:10"
PYTHON_BIN="python"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install) MODE="install"; shift ;;
    --uninstall) MODE="uninstall"; shift ;;
    --show) MODE="show"; shift ;;
    --eval-time) EVAL_TIME="${2:-}"; shift 2 ;;
    --trend-time) TREND_TIME="${2:-}"; shift 2 ;;
    --python) PYTHON_BIN="${2:-python}"; shift 2 ;;
    -h|--help)
      sed -n '1,120p' "$0"; exit 0 ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

# -------- Pre-flight --------

need_bin crontab
need_bin bash
need_bin "$PYTHON_BIN"

[[ -f "scripts/run_st1205_eval.sh" ]] || die "Missing scripts/run_st1205_eval.sh"
[[ -f "scripts/make_st1205_trend.py" ]] || die "Missing scripts/make_st1205_trend.py"

mkdir -p status/logs

# -------- Markers & Lines --------

KEY="$(safe_key)"
TAG_EVAL="# GG_ST1205_EVAL:${KEY}"
TAG_TREND="# GG_ST1205_TREND:${KEY}"

CRON_TIME_EVAL="$(to_cron_time "$EVAL_TIME")"
CRON_TIME_TREND="$(to_cron_time "$TREND_TIME")"

# Use absolute project path and relative logs in repo
EVAL_CMD="cd ${PROJECT_ROOT} && bash scripts/run_st1205_eval.sh --quiet >> status/logs/st1205_eval.cron.log 2>&1"
TREND_CMD="cd ${PROJECT_ROOT} && ${PYTHON_BIN} scripts/make_st1205_trend.py >> status/logs/st1205_trend.cron.log 2>&1"

EVAL_LINE="${CRON_TIME_EVAL} ${EVAL_CMD} ${TAG_EVAL}"
TREND_LINE="${CRON_TIME_TREND} ${TREND_CMD} ${TAG_TREND}"

# -------- Actions --------

current_cron() { crontab -l 2>/dev/null || true; }

install_cron() {
  note "Installing/updating cron entries..."
  local tmp
  tmp="$(mktemp)"
  # remove our existing entries (by marker)
  current_cron | grep -v -F "${TAG_EVAL}" | grep -v -F "${TAG_TREND}" > "$tmp"
  {
    echo "$EVAL_LINE"
    echo "$TREND_LINE"
  } >> "$tmp"
  crontab "$tmp"
  rm -f "$tmp"

  note "Installed:"
  echo "  - $EVAL_LINE"
  echo "  - $TREND_LINE"
  note "Logs:"
  echo "  - ${PROJECT_ROOT}/status/logs/st1205_eval.cron.log"
  echo "  - ${PROJECT_ROOT}/status/logs/st1205_trend.cron.log"
}

uninstall_cron() {
  note "Removing cron entries for this project..."
  local tmp
  tmp="$(mktemp)"
  current_cron | grep -v -F "${TAG_EVAL}" | grep -v -F "${TAG_TREND}" > "$tmp"
  crontab "$tmp"
  rm -f "$tmp"
  note "Removed markers:"
  echo "  - ${TAG_EVAL}"
  echo "  - ${TAG_TREND}"
}

show_cron() {
  note "Current crontab:"
  current_cron | sed 's/^/  /' || true
  echo
  note "Filtered (this project):"
  current_cron | grep -E "${TAG_EVAL//\#/\\#}|${TAG_TREND//\#/\\#}" || echo "  (none)"
}

case "$MODE" in
  install)   install_cron ;;
  uninstall) uninstall_cron ;;
  show)      show_cron ;;
  *)         die "Unknown MODE: $MODE" ;;
esac

# -------- Next-step hints --------

echo
note "Done."
note "You can verify next run times with:  crontab -l"
note "To trigger immediately (manual):"
echo "  bash scripts/run_st1205_eval.sh --quiet"
echo "  ${PYTHON_BIN} scripts/make_st1205_trend.py --stdout"

# -------- New thread trigger (for operator notes) --------
# If this was part of a larger rollout requiring a fresh thread/checkpoint, use:
#   새 스레드 시작 — ST-1205 일일 평가/트렌드 자동화 운영화. Cron 등록(09:00/09:10) 및 운영 로그(status/logs/*) 모니터링. A1 채팅 Recall 주입 연계 착수.
