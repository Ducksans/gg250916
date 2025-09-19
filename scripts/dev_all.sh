#!/usr/bin/env bash
# dev_all.sh — One-command launcher for Backend, Bridge, and Vite (v8, Final Stability)
# Mode:
#   - tmux   : open a tmux session with 3 panes
#
# Usage:
#   ./scripts/dev_all.sh tmux

set -euo pipefail

# ---------- Paths & Defaults ----------
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

HOST="${HOST:-127.0.0.1}"
PORT_BACKEND="${PORT_BACKEND:-8000}"
PORT_BRIDGE="${PORT_BRIDGE:-3037}"

SESSION_NAME="${DEV_ALL_SESSION:-gg_dev}"
LOG_DIR="${ROOT_DIR}/status/evidence/ops/dev_all/$(date -u +"%Y%m%d_%H%M%SZ")"
mkdir -p "${LOG_DIR}"

# --- Commands ---
BACKEND_CMD="HOST=${HOST} PORT=${PORT_BACKEND} RELOAD=1 RELOAD_DIRS=\"app,gumgang_0_5\" \"${ROOT_DIR}/scripts/dev_backend.sh\" run"
BRIDGE_CMD="PORT=${PORT_BRIDGE} node \"${ROOT_DIR}/bridge/server.js\""
VITE_ROOT="${ROOT_DIR}/ui/dev_a1_vite"
VITE_CMD="npm run dev"

# ---------- Helpers ----------
have_cmd() { command -v "$1" >/dev/null 2>&1; }
warn() { echo "[WARN] $*" >&2; }
err()  { echo "[FAIL] $*" >&2; }

# ---------- tmux mode ----------
cmd_tmux() {
  have_cmd tmux || { err "tmux not found. Install tmux."; exit 1; }

  if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    warn "tmux session '${SESSION_NAME}' already exists; attaching."
    tmux attach -t "${SESSION_NAME}"
    return 0
  fi

  # Pane 0: Backend (좌상단)
  TMUX_BACK_CMD="cd '${ROOT_DIR}'; ${BACKEND_CMD} 2>&1 | tee -a '${LOG_DIR}/backend.log'"
  tmux new-session -d -s "${SESSION_NAME}" -n "gg" "bash -lc \"${TMUX_BACK_CMD}\""

  # Pane 1: Bridge (우상단)
  TMUX_BRIDGE_CMD="cd '${ROOT_DIR}'; ${BRIDGE_CMD} 2>&1 | tee -a '${LOG_DIR}/bridge.log'"
  tmux split-window -h -t "${SESSION_NAME}:0.0" "bash -lc \"${TMUX_BRIDGE_CMD}\""

  if [ -d "${VITE_ROOT}" ] && have_cmd npm; then
    # Pane 2: Vite Dev (좌하단)
    TMUX_VITE_CMD="cd '${VITE_ROOT}'; ${VITE_CMD} 2>&1 | tee -a '${LOG_DIR}/vite.log'"
    tmux split-window -v -t "${SESSION_NAME}:0.0" "bash -lc \"${TMUX_VITE_CMD}\""

    # Pane 3: Vite Preview (우하단)
    TMUX_VITE_PREVIEW_CMD="cd '${VITE_ROOT}'; npm run build && npm run preview -- --strictPort --port 5175 2>&1 | tee -a '${LOG_DIR}/vite_preview.log'"
    tmux split-window -v -t "${SESSION_NAME}:0.1" "bash -lc \"${TMUX_VITE_PREVIEW_CMD}\""
  else
    warn "Vite prerequisites not met; creating placeholder panes."
    tmux split-window -v -t "${SESSION_NAME}:0.0" "echo 'Vite dev skipped'; bash"
    tmux split-window -v -t "${SESSION_NAME}:0.1" "echo 'Vite preview skipped'; bash"
  fi

  tmux select-layout -t "${SESSION_NAME}:0" tiled
  tmux set-option -t "${SESSION_NAME}" remain-on-exit on
  tmux select-pane -t "${SESSION_NAME}:0.0"

  echo "== tmux session '${SESSION_NAME}' launched (4 panes) =="
  echo "Attach: tmux attach -t ${SESSION_NAME}"
  tmux attach -t "${SESSION_NAME}"
}

main() {
  case "${1:-}" in
    tmux)   cmd_tmux ;;
    *)
      echo "Usage: $0 tmux"
      exit 1
      ;;
  esac
}

main "$@"
