#!/usr/bin/env bash
# dev_core_all.sh — Launch Backend(8000), Bridge(3037), and Vite(5173) from the CORE repo using tmux
# Usage:
#   ./scripts/dev_core_all.sh tmux [CORE_ROOT]
# Example:
#   ./scripts/dev_core_all.sh tmux exports/gumgang_meeting_core

set -euo pipefail

MODE="${1:-}"
CORE_ROOT="${2:-$(pwd)/exports/gumgang_meeting_core}"

HOST="${HOST:-127.0.0.1}"
PORT_BACKEND="${PORT_BACKEND:-8000}"
PORT_BRIDGE="${PORT_BRIDGE:-3037}"
SESSION_NAME="${DEV_ALL_SESSION:-gg_core_dev}"

have_cmd() { command -v "$1" >/dev/null 2>&1; }
warn() { echo "[WARN] $*" >&2; }
err()  { echo "[FAIL] $*" >&2; }

case "$MODE" in
  tmux) ;;
  *) echo "Usage: $0 tmux [CORE_ROOT]"; exit 1;;
esac

if [ ! -d "$CORE_ROOT" ]; then
  err "CORE_ROOT not found: $CORE_ROOT"; exit 2
fi

LOG_DIR="$CORE_ROOT/status/evidence/ops/dev_core_all/$(date -u +"%Y%m%d_%H%M%SZ")"
mkdir -p "$LOG_DIR"

BACKEND_CMD="HOST=${HOST} PORT=${PORT_BACKEND} RELOAD=1 RELOAD_DIRS=\"app,gumgang_0_5\" \"$CORE_ROOT/scripts/dev_backend.sh\" run"
BRIDGE_CMD="PORT=${PORT_BRIDGE} node \"$CORE_ROOT/bridge/server.js\""
VITE_ROOT="$CORE_ROOT/ui/dev_a1_vite"
VITE_CMD="npm run dev"

have_cmd tmux || { err "tmux not found. Install tmux."; exit 1; }

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  warn "tmux session '$SESSION_NAME' already exists; attaching."
  exec tmux attach -t "$SESSION_NAME"
fi

# Pane 0: Backend (top)
TMUX_BACK_CMD="cd '$CORE_ROOT'; $BACKEND_CMD 2>&1 | tee -a '$LOG_DIR/backend.log'"
tmux new-session -d -s "$SESSION_NAME" -n "gg-core" "bash -lc \"$TMUX_BACK_CMD\""

# Pane 1: Bridge (bottom-left)
TMUX_BRIDGE_CMD="cd '$CORE_ROOT'; $BRIDGE_CMD 2>&1 | tee -a '$LOG_DIR/bridge.log'"
tmux split-window -v -t "$SESSION_NAME:0.0" "bash -lc \"$TMUX_BRIDGE_CMD\""

# Pane 2: Vite (bottom-right)
if [ -d "$VITE_ROOT" ] && have_cmd npm; then
  TMUX_VITE_CMD="cd '$VITE_ROOT'; $VITE_CMD 2>&1 | tee -a '$LOG_DIR/vite.log'"
  tmux split-window -h -t "$SESSION_NAME:0.1" "bash -lc \"$TMUX_VITE_CMD\""
else
  warn "Vite prerequisites not met; creating empty pane."
  tmux split-window -h -t "$SESSION_NAME:0.1" "echo 'Vite skipped'; bash"
fi

tmux select-pane -t "$SESSION_NAME:0.0"
echo "== tmux session '$SESSION_NAME' launched for CORE at $CORE_ROOT =="
echo "Attach: tmux attach -t $SESSION_NAME"
exec tmux attach -t "$SESSION_NAME"

