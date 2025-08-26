#!/usr/bin/env bash
# dev_all.sh — One-command launcher for Backend, Bridge, and Tauri (default ON)
# Modes:
#   - start  : run backend + bridge in background with logs and PID files
#   - stop   : stop background processes cleanly using PID files
#   - status : show health of backend/bridge and running PIDs
#   - tmux   : open a tmux session with 3 panes (backend | bridge | tauri)
#
# Usage:
#   chmod +x scripts/dev_all.sh
#   ./scripts/dev_all.sh tmux
#   ./scripts/dev_all.sh start
#   ./scripts/dev_all.sh status
#   ./scripts/dev_all.sh stop
#
# Env overrides:
#   HOST=127.0.0.1 PORT_BACKEND=8000 PORT_BRIDGE=3037 RUN_TAURI=0 DEV_ALL_SESSION=gg_dev ./scripts/dev_all.sh tmux
#
# Outputs (logs, background mode):
#   status/evidence/ops/dev_all/<UTC_STAMP>/{backend.log,bridge.log,summary.json}
#
# Notes:
#   - Backend runner delegates to scripts/dev_backend.sh (venv + uvicorn).
#   - Bridge runs node bridge/server.js (PORT_BRIDGE).
#   - Tauri (npm run tauri:dev) is best in tmux mode (interactive); background mode skips it by default.
#   - This script does not itself daemonize tmux; tmux session survives until you exit it.

set -euo pipefail

# ---------- Paths & Defaults ----------
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

HOST="${HOST:-127.0.0.1}"
PORT_BACKEND="${PORT_BACKEND:-8000}"
PORT_BRIDGE="${PORT_BRIDGE:-3037}"

SESSION_NAME="${DEV_ALL_SESSION:-gg_dev}"
RUN_DIR="${ROOT_DIR}/.run/dev_all"
STAMP="$(date -u +"%Y%m%d_%H%M%SZ")"
LOG_DIR="${ROOT_DIR}/status/evidence/ops/dev_all/${STAMP}"
mkdir -p "${RUN_DIR}" "${LOG_DIR}"

BACKEND_CMD="HOST=${HOST} PORT=${PORT_BACKEND} RELOAD=${RELOAD:-1} \"${ROOT_DIR}/scripts/dev_backend.sh\" run"
BRIDGE_CMD="PORT=${PORT_BRIDGE} node \"${ROOT_DIR}/bridge/server.js\""
TAURI_ROOT="${ROOT_DIR}/gumgang_0_5/gumgang-v2"
TAURI_CMD="npm run tauri:dev"
RUN_TAURI="${RUN_TAURI:-1}"

# ---------- Helpers ----------
bold() { printf "\033[1m%s\033[0m" "$*"; }
info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*" >&2; }
err()  { echo "[FAIL] $*" >&2; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

pid_is_running() {
  local pid="$1"
  [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null
}

write_summary() {
  local path="${LOG_DIR}/summary.json"
  cat >"${path}" <<EOF
{
  "utc_ts": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "host": "${HOST}",
  "backend": { "port": ${PORT_BACKEND}, "log": "$(realpath --relative-to="${ROOT_DIR}" "${LOG_DIR}/backend.log")" },
  "bridge":  { "port": ${PORT_BRIDGE},  "log": "$(realpath --relative-to="${ROOT_DIR}" "${LOG_DIR}/bridge.log")" },
  "mode": "${1}"
}
EOF
  info "Wrote summary: ${path#${ROOT_DIR}/}"
}

preflight() {
  if [ -x "${ROOT_DIR}/scripts/preflight.sh" ]; then
    info "Running preflight checks..."
    if ! "${ROOT_DIR}/scripts/preflight.sh"; then
      warn "Preflight reported issues; attempting to continue (see above)."
    fi
  else
    warn "preflight.sh not found; skipping."
  fi
}

ensure_prereqs() {
  [ -x "${ROOT_DIR}/scripts/dev_backend.sh" ] || { err "scripts/dev_backend.sh missing"; exit 1; }
  have_cmd node || { err "node not found (install Node.js)"; exit 1; }
  # npm/tauri checked lazily for tmux-tauri pane
}

# ---------- Background mode ----------
start_backend_bg() {
  local pidfile="${RUN_DIR}/backend.pid"
  if [ -f "${pidfile}" ] && pid_is_running "$(cat "${pidfile}")"; then
    warn "Backend already running (PID $(cat "${pidfile}"))"
    return 0
  fi
  info "Starting backend (bg) on ${HOST}:${PORT_BACKEND} ..."
  nohup bash -lc "cd '${ROOT_DIR}' && ${BACKEND_CMD}" >"${LOG_DIR}/backend.log" 2>&1 &
  echo $! >"${pidfile}"
  info "Backend PID: $(cat "${pidfile}") (log: ${LOG_DIR}/backend.log)"
}

start_bridge_bg() {
  local pidfile="${RUN_DIR}/bridge.pid"
  if [ -f "${pidfile}" ] && pid_is_running "$(cat "${pidfile}")"; then
    warn "Bridge already running (PID $(cat "${pidfile}"))"
    return 0
  fi
  info "Starting bridge (bg) on :${PORT_BRIDGE} ..."
  nohup bash -lc "cd '${ROOT_DIR}' && ${BRIDGE_CMD}" >"${LOG_DIR}/bridge.log" 2>&1 &
  echo $! >"${pidfile}"
  info "Bridge PID: $(cat "${pidfile}") (log: ${LOG_DIR}/bridge.log)"
}

stop_bg() {
  local ok=0
  for name in backend bridge; do
    local pidfile="${RUN_DIR}/${name}.pid"
    if [ -f "${pidfile}" ]; then
      local pid; pid="$(cat "${pidfile}")"
      if pid_is_running "${pid}"; then
        info "Stopping ${name} (PID ${pid}) ..."
        kill -TERM "${pid}" 2>/dev/null || true
      fi
      rm -f "${pidfile}"
      ok=$((ok+1))
    fi
  done
  if [ "${ok}" -eq 0 ]; then
    warn "No PID files found under ${RUN_DIR}"
  else
    info "Stop signal sent."
  fi
}

status_bg() {
  local backend_pid="-"; local bridge_pid="-"
  [ -f "${RUN_DIR}/backend.pid" ] && backend_pid="$(cat "${RUN_DIR}/backend.pid")"
  [ -f "${RUN_DIR}/bridge.pid" ] && bridge_pid="$(cat "${RUN_DIR}/bridge.pid")"

  echo "== Status (bg) =="
  printf "Backend PID: %s  " "${backend_pid}"
  if have_cmd curl; then
    curl -fsS "http://${HOST}:${PORT_BACKEND}/api/health" >/dev/null && echo "[OK]" || echo "[DOWN]"
  else
    echo
  fi
  printf "Bridge  PID: %s  " "${bridge_pid}"
  if have_cmd curl; then
    curl -fsS "http://127.0.0.1:${PORT_BRIDGE}/api/health" >/dev/null && echo "[OK]" || echo "[DOWN]"
  else
    echo
  fi
  echo "Logs:"
  echo "  backend: ${LOG_DIR}/backend.log"
  echo "  bridge : ${LOG_DIR}/bridge.log"
}

cmd_start() {
  ensure_prereqs
  preflight
  start_backend_bg
  start_bridge_bg
  write_summary "background"
  info "Tip: ./scripts/dev_all.sh status"
}

cmd_stop() {
  stop_bg
}

cmd_status() {
  status_bg
}

# ---------- tmux mode ----------
cmd_tmux() {
  ensure_prereqs
  have_cmd tmux || { err "tmux not found. Install tmux or use 'start' mode."; exit 1; }

  preflight

  # Create session
  if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    warn "tmux session '${SESSION_NAME}' already exists; attaching."
    tmux attach -t "${SESSION_NAME}"
    return 0
  fi

  # Pane 1: Backend (with tee log)
  TMUX_BACK_CMD="export HOST='${HOST}' PORT='${PORT_BACKEND}'; cd '${ROOT_DIR}'; ${BACKEND_CMD} 2>&1 | tee -a '${LOG_DIR}/backend.log'"
  tmux new-session -d -s "${SESSION_NAME}" -n "gg" "bash -lc \"${TMUX_BACK_CMD}\""

  # Pane 2: Bridge
  TMUX_BRIDGE_CMD="export PORT='${PORT_BRIDGE}'; cd '${ROOT_DIR}'; ${BRIDGE_CMD} 2>&1 | tee -a '${LOG_DIR}/bridge.log'"
  tmux split-window -h -t "${SESSION_NAME}:0" "bash -lc \"${TMUX_BRIDGE_CMD}\""

  # Pane 3: Tauri (optional)
  if [ "${RUN_TAURI}" = "1" ] && [ -d "${TAURI_ROOT}" ]; then
    if have_cmd npm; then
      TMUX_TAURI_CMD="cd '${TAURI_ROOT}'; ${TAURI_CMD}"
      tmux split-window -v -t "${SESSION_NAME}:0.1" "bash -lc \"${TMUX_TAURI_CMD}\""
    else
      warn "npm not found; skipping Tauri pane."
    fi
  fi

  # Layout & hints
  tmux select-layout -t "${SESSION_NAME}:0" tiled >/dev/null 2>&1 || true
  tmux set-option -t "${SESSION_NAME}" remain-on-exit on >/dev/null
  write_summary "tmux"

  echo
  echo "== tmux session '${SESSION_NAME}' launched =="
  echo "Panes:"
  echo "  - Backend: ${HOST}:${PORT_BACKEND} (logs tee → ${LOG_DIR}/backend.log)"
  echo "  - Bridge : :${PORT_BRIDGE} (logs tee → ${LOG_DIR}/bridge.log)"
  if [ "${RUN_TAURI}" = "1" ] && [ -d "${TAURI_ROOT}" ]; then
    echo "  - Tauri  : ${TAURI_ROOT} (npm run tauri:dev)"
  else
    echo "  - Tauri  : skipped (set RUN_TAURI=1 to enable, requires ${TAURI_ROOT})"
  fi
  echo
  echo "Attach: tmux attach -t ${SESSION_NAME}    (exit panes to stop)"
  tmux attach -t "${SESSION_NAME}"
}

usage() {
  cat <<EOF
$(bold "dev_all.sh") — one-command launcher (backend + bridge + optional tauri)

Commands:
  tmux     Start a tmux session with panes: backend | bridge | (tauri optional)
  start    Start backend & bridge in background (logs under ${LOG_DIR})
  stop     Stop background backend & bridge by PID files (${RUN_DIR})
  status   Show health and PIDs/logs for background mode

Env:
  HOST (default ${HOST})
  PORT_BACKEND (default ${PORT_BACKEND})
  PORT_BRIDGE  (default ${PORT_BRIDGE})
  +  RUN_TAURI=0 to skip Tauri in tmux mode (default ON; requires ${TAURI_ROOT})
  DEV_ALL_SESSION (default ${SESSION_NAME})

How to use results:
  - In tmux mode, observe live logs in panes; Tauri window opens as a GUI app.
  - In background mode, tail logs:
      tail -f ${LOG_DIR}/backend.log
      tail -f ${LOG_DIR}/bridge.log
  - Health checks:
      curl -s http://${HOST}:${PORT_BACKEND}/api/health | jq .
      curl -s http://127.0.0.1:${PORT_BRIDGE}/api/health | jq .

EOF
}

main() {
  case "${1:-}" in
    tmux)   cmd_tmux ;;
    start)  cmd_start ;;
    stop)   cmd_stop ;;
    status) cmd_status ;;
    help|-h|--help) usage ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
