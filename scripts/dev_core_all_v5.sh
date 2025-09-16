#!/usr/bin/env bash
# dev_core_all_v5.sh — One-click tmux launcher (root helper 우선 + 안전한 reload)
# - Backend: 프로젝트 루트 dev_backend.sh(run) + RELOAD_DIRS=app 고정, 없으면 uvicorn 직접 실행(존재 경로만 감시)
# - Bridge: .env 자동 탐색(core/.env → 루트/.env)
# - Vite: deps 자동 설치
# - tmux: 항상 새 세션 생성(remain-on-exit on)

set -euo pipefail
MODE="${1:-}"
CORE_ROOT="${2:-$(pwd)/exports/gumgang_meeting_core}"
[ "$MODE" = tmux ] || { echo "Usage: $0 tmux [CORE_ROOT]"; exit 1; }
[ -d "$CORE_ROOT" ] || { echo "[FAIL] CORE_ROOT not found: $CORE_ROOT" >&2; exit 2; }

HOST="${HOST:-127.0.0.1}"
PORT_BACKEND="${PORT_BACKEND:-8000}"
PORT_BRIDGE="${PORT_BRIDGE:-3037}"
SESSION_NAME="${DEV_ALL_SESSION:-gg_core_dev}"
LOG_DIR="$CORE_ROOT/status/evidence/ops/dev_core_all/$(date -u +"%Y%m%d_%H%M%SZ")"
mkdir -p "$LOG_DIR"
PROJECT_ROOT="$(cd "$CORE_ROOT/../.." && pwd)"
DOTENV="$CORE_ROOT/.env"; [ -f "$DOTENV" ] || DOTENV="$PROJECT_ROOT/.env"

backend_cmd() {
  set -e
  # 1) 루트 helper 우선(수동 성공과 동일 환경)
  if [ -x "$PROJECT_ROOT/scripts/dev_backend.sh" ]; then
    cd "$PROJECT_ROOT"
    echo "[BOOT] dev_backend.sh (root) with RELOAD_DIRS=app" | tee -a "$LOG_DIR/backend.log"
    RELOAD=1 RELOAD_DIRS=app "$PROJECT_ROOT/scripts/dev_backend.sh" run
    return
  fi
  # 2) helper 없으면 최소 경로로 직접 uvicorn 실행(존재 경로만 감시)
  cd "$PROJECT_ROOT"
  VENV="$PROJECT_ROOT/.venv"; python3 -m venv "$VENV" 2>/dev/null || true
  "$VENV/bin/pip" -q install --upgrade pip >/dev/null
  if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    "$VENV/bin/pip" -q install -r "$PROJECT_ROOT/requirements.txt" >/dev/null || true
  fi
  "$VENV/bin/pip" -q install 'fastapi>=0.110' 'uvicorn[standard]>=0.23' 'python-dotenv>=1.0.0' >/dev/null || true
  EXTRA=( )
  [ -d "$PROJECT_ROOT/app" ] && EXTRA+=( --reload-dir "$PROJECT_ROOT/app" )
  [ -d "$PROJECT_ROOT/gumgang_0_5" ] && EXTRA+=( --reload-dir "$PROJECT_ROOT/gumgang_0_5" )
  echo "[BOOT] Backend (uvicorn) from $PROJECT_ROOT on $HOST:$PORT_BACKEND" | tee -a "$LOG_DIR/backend.log"
  exec "$VENV/bin/python" -m uvicorn app.api:app --app-dir "$PROJECT_ROOT" \
    --host "$HOST" --port "$PORT_BACKEND" --reload "${EXTRA[@]}"
}

bridge_cmd() {
  set -e
  cd "$CORE_ROOT"
  if [ -f "$DOTENV" ]; then PORT="$PORT_BRIDGE" DOTENV_PATH="$DOTENV" node bridge/server.js; else PORT="$PORT_BRIDGE" node bridge/server.js; fi
}

vite_cmd() {
  set -e
  local VITE_ROOT="$CORE_ROOT/ui/dev_a1_vite"; [ -d "$VITE_ROOT" ] || { echo "[FAIL] VITE root missing: $VITE_ROOT"; return 1; }
  if [ ! -d "$VITE_ROOT/node_modules" ]; then echo "[Vite] Installing deps (npm ci) ..." | tee -a "$LOG_DIR/vite.log"; npm ci --prefix "$VITE_ROOT"; fi
  cd "$VITE_ROOT" && npm run dev
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }
if ! have_cmd tmux; then echo "[FAIL] tmux not found" >&2; exit 1; fi
# 과거 세션 잔류 방지: 항상 새 세션 생성
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then tmux kill-session -t "$SESSION_NAME"; fi

export -f backend_cmd bridge_cmd vite_cmd
export CORE_ROOT PROJECT_ROOT LOG_DIR HOST PORT_BACKEND PORT_BRIDGE DOTENV

# Optional: CI last-green watcher (preview on port 5175)
green_cmd() {
  set -e
  cd "$PROJECT_ROOT"
  PORT_GREEN="${PORT_GREEN:-5175}"
  # Always force a clean preview worktree to avoid orphaned/stale state
  bash scripts/watch_last_green.sh --core "$CORE_ROOT" --port "$PORT_GREEN" --force-recreate
}
export -f green_cmd

TMUX_S="$SESSION_NAME"
TMUX_BACK_CMD="backend_cmd 2>&1 | tee -a '$LOG_DIR/backend.log'; echo '[backend pane exited]'; bash"
TMUX_BRIDGE_CMD="bridge_cmd 2>&1 | tee -a '$LOG_DIR/bridge.log'; echo '[bridge pane exited]'; bash"
TMUX_VITE_CMD="vite_cmd 2>&1 | tee -a '$LOG_DIR/vite.log'; echo '[vite pane exited]'; bash"
TMUX_GREEN_CMD="green_cmd 2>&1 | tee -a '$LOG_DIR/green.log'; echo '[green pane exited]'; bash"

tmux new-session -d -s "$TMUX_S" -n "gg-core" "bash -lc \"$TMUX_BACK_CMD\""
# 0: backend, split horizontally for bridge
tmux split-window -h -t "$TMUX_S:0.0" "bash -lc \"$TMUX_BRIDGE_CMD\""
# split vertically under backend for vite (5173)
tmux split-window -v -t "$TMUX_S:0.0" "bash -lc \"$TMUX_VITE_CMD\""
# split vertically under bridge for green watcher (5175)
tmux split-window -v -t "$TMUX_S:0.1" "bash -lc \"$TMUX_GREEN_CMD\""
# tidy to 2x2
tmux select-layout -t "$TMUX_S:0" tiled

tmux set-option -t "$TMUX_S" remain-on-exit on

tmux select-pane -t "$TMUX_S:0.0"; echo "== tmux '$TMUX_S' launched =="; exec tmux attach -t "$TMUX_S"
