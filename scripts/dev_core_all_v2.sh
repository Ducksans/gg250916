#!/usr/bin/env bash
# dev_core_all_v2.sh — Robust one-click tmux launcher for Core repo
# - Ensures npm deps for Vite
# - Keeps panes open on failure (remain-on-exit)
# - Locates .env (core/.env or project/.env) for Bridge
# Usage: ./scripts/dev_core_all_v2.sh tmux [CORE_ROOT]

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

if [ ! -d "$CORE_ROOT" ]; then err "CORE_ROOT not found: $CORE_ROOT"; exit 2; fi

LOG_DIR="$CORE_ROOT/status/evidence/ops/dev_core_all/$(date -u +"%Y%m%d_%H%M%SZ")"
mkdir -p "$LOG_DIR"

# Resolve .env for Bridge
PROJECT_ROOT="$(cd "$CORE_ROOT/.." && pwd)"
DOTENV="$CORE_ROOT/.env"
if [ ! -f "$DOTENV" ] && [ -f "$PROJECT_ROOT/.env" ]; then DOTENV="$PROJECT_ROOT/.env"; fi
[ -f "$DOTENV" ] || warn ".env not found for Bridge (optional)"

backend_cmd() {
  cd "$CORE_ROOT"
  if [ -x "scripts/dev_backend.sh" ]; then
    HOST="$HOST" PORT="$PORT_BACKEND" RELOAD=1 RELOAD_DIRS="app,gumgang_0_5" \
      "scripts/dev_backend.sh" run
  else
    # Fallback: try uvicorn directly from project root
    cd "$PROJECT_ROOT"
    python3 -m uvicorn app.api:app --host "$HOST" --port "$PORT_BRIDGE"  # wrong port intentionally to force fallback avoided
  fi
}

bridge_cmd() {
  cd "$CORE_ROOT"
  PORT="$PORT_BRIDGE" DOTENV_PATH="$DOTENV" node bridge/server.js
}

vite_cmd() {
  local VITE_ROOT="$CORE_ROOT/ui/dev_a1_vite"
  if [ -d "$VITE_ROOT" ]; then
    if [ ! -d "$VITE_ROOT/node_modules" ]; then
      echo "[Vite] Installing deps (npm ci) ..." | tee -a "$LOG_DIR/vite.log"
      npm ci --prefix "$VITE_ROOT"
    fi
    cd "$VITE_ROOT" && npm run dev
  else
    err "Vite root not found: $VITE_ROOT"; return 1
  fi
}

have_cmd tmux || { err "tmux not found. Install tmux."; exit 1; }

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  warn "tmux session '$SESSION_NAME' already exists; attaching."
  exec tmux attach -t "$SESSION_NAME"
fi

# Start session
TMUX_BACK_CMD="cd '$CORE_ROOT'; backend_cmd 2>&1 | tee -a '$LOG_DIR/backend.log'; echo '[backend pane exited]'; bash"
TMUX_BRIDGE_CMD="cd '$CORE_ROOT'; bridge_cmd 2>&1 | tee -a '$LOG_DIR/bridge.log'; echo '[bridge pane exited]'; bash"
TMUX_VITE_CMD="cd '$CORE_ROOT'; vite_cmd 2>&1 | tee -a '$LOG_DIR/vite.log'; echo '[vite pane exited]'; bash"

# Export functions for subshells
export -f backend_cmd bridge_cmd vite_cmd
export CORE_ROOT LOG_DIR HOST PORT_BACKEND PORT_BRIDGE PROJECT_ROOT DOTENV

# Create panes
TMUX_S="${SESSION_NAME}"

tmux new-session -d -s "$TMUX_S" -n "gg-core" "bash -lc \"$TMUX_BACK_CMD\""
tmux split-window -v -t "$TMUX_S:0.0" "bash -lc \"$TMUX_BRIDGE_CMD\""
tmux split-window -h -t "$TMUX_S:0.1" "bash -lc \"$TMUX_VITE_CMD\""

tmux set-option -t "$TMUX_S" remain-on-exit on

tmux select-pane -t "$TMUX_S:0.0"
echo "== tmux session '$TMUX_S' launched for CORE at $CORE_ROOT =="
echo "Attach: tmux attach -t $TMUX_S"
exec tmux attach -t "$TMUX_S"
