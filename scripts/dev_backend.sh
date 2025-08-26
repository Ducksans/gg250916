#!/usr/bin/env bash
# dev_backend.sh — Create/use a project-local venv and run the BT-10 backend (FastAPI/uvicorn)
# - Safe defaults per .rules v3.0 (backend port 8000)
# - Never auto-starts; user explicitly calls: init | install | run | health | freeze | env
#
# Usage:
#   chmod +x scripts/dev_backend.sh
#   ./scripts/dev_backend.sh init          # create venv and install deps
#   ./scripts/dev_backend.sh install       # (re)install/upgrade deps into venv
#   ./scripts/dev_backend.sh run           # run uvicorn app.api:app on HOST:PORT
#   ./scripts/dev_backend.sh health        # curl backend health endpoint
#   ./scripts/dev_backend.sh freeze        # save pip freeze + runtime snapshot to status/evidence
#   ./scripts/dev_backend.sh env           # print important env and paths
#
# Env overrides:
#   HOST=127.0.0.1 PORT=8000 RELOAD=0 VENV_DIR=/custom/venv ./scripts/dev_backend.sh run
#
# Notes:
# - This helper avoids system-wide installs (PEP 668) by using a project venv.
# - Do not commit venv/ (it is ignored by typical VCS settings).
# - BACKEND_ENTRYPOINT: uvicorn app.api:app --port 8000

set -euo pipefail

# ---------- Paths ----------
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${ROOT_DIR}"
ENV_FILE="${ROOT_DIR}/.env"
VENV_DIR="${VENV_DIR:-${ROOT_DIR}/venv}"
VENV_BIN="${VENV_DIR}/bin"

# ---------- Defaults ----------
PYTHON_BIN="${PYTHON:-python3}"
PIP_BIN="${PIP:-${PYTHON_BIN} -m pip}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
RELOAD="${RELOAD:-0}"
RELOAD_FLAG=$([ "${RELOAD}" = "1" ] && echo "--reload" || echo "")
HEALTH_URL="http://${HOST}:${PORT}/api/health"

# ---------- Deps ----------
# Keep minimal and aligned with gumgang_meeting/app/api.py
DEPS=(
  "fastapi>=0.110"
  "uvicorn[standard]>=0.23"
  "python-multipart>=0.0.9"
)

# ---------- UX helpers ----------
bold() { printf "\033[1m%s\033[0m" "$*"; }
info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*" >&2; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

usage() {
  cat <<EOF
$(bold "dev_backend.sh") — project-local backend helper

Commands:
  init      Create venv and install deps
  install   (Re)install/upgrade deps into venv
  run       Run uvicorn (app.api:app) on \${HOST}:\${PORT} (${HOST}:${PORT})
  health    Curl backend health endpoint (${HEALTH_URL})
  freeze    Write pip freeze & runtime snapshot to status/evidence/packaging
  env       Print important env and resolved paths

Examples:
  ./scripts/dev_backend.sh init
  RELOAD=1 ./scripts/dev_backend.sh run
  HOST=0.0.0.0 PORT=8000 ./scripts/dev_backend.sh run

EOF
}

ensure_python_venv() {
  if ! "${PYTHON_BIN}" -c "import venv" 2>/dev/null; then
    warn "python venv module not found. On Debian/Ubuntu:"
    warn "  sudo apt-get update && sudo apt-get install -y python3-venv"
    die  "Missing python venv support"
  fi
}

create_venv() {
  if [ -d "${VENV_DIR}" ]; then
    info "venv already exists at ${VENV_DIR}"
  else
    info "Creating venv at ${VENV_DIR}"
    "${PYTHON_BIN}" -m venv "${VENV_DIR}" || die "venv creation failed"
  fi
  info "Upgrading pip/setuptools/wheel"
  "${VENV_BIN}/python" -m pip install --upgrade pip setuptools wheel >/dev/null
}

install_deps() {
  info "Installing deps into venv: ${DEPS[*]}"
  "${VENV_BIN}/pip" install "${DEPS[@]}"
}

cmd_init() {
  ensure_python_venv
  create_venv
  install_deps
  info "Done. Activate with: source \"${VENV_BIN}/activate\""
}

cmd_install() {
  [ -d "${VENV_DIR}" ] || cmd_init
  install_deps
}

cmd_run() {
  [ -d "${VENV_DIR}" ] || cmd_init
  cd "${APP_DIR}"
  info "Running backend on ${HOST}:${PORT} (reload=${RELOAD})"
  info "App dir: ${APP_DIR}"
  info "Env file: ${ENV_FILE} (app reads directly; no export required)"
  exec "${VENV_BIN}/python" -m uvicorn app.api:app --app-dir "${APP_DIR}" --host "${HOST}" --port "${PORT}" ${RELOAD_FLAG}
}

cmd_health() {
  if ! command -v curl >/dev/null 2>&1; then
    die "curl not found. Install: sudo apt-get install -y curl"
  fi
  info "GET ${HEALTH_URL}"
  curl -sS "${HEALTH_URL}" || true
  echo
}

timestamp_utc() {
  # ISO8601Z without sub-seconds
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

stamp_compact() {
  date -u +"%Y%m%d_%H%M%SZ"
}

cmd_freeze() {
  [ -d "${VENV_DIR}" ] || cmd_init
  SNAP_DIR="${ROOT_DIR}/status/evidence/packaging"
  mkdir -p "${SNAP_DIR}"
  STAMP="$(stamp_compact)"
  OUT="${SNAP_DIR}/dev_backend_freeze_${STAMP}.txt"

  {
    echo "# dev_backend freeze snapshot"
    echo "UTC_TS: $(timestamp_utc)"
    echo "ROOT_DIR: ${ROOT_DIR}"
    echo "APP_DIR: ${APP_DIR}"
    echo "ENV_FILE: ${ENV_FILE}"
    echo "HOST: ${HOST}"
    echo "PORT: ${PORT}"
    echo "PYTHON: $("${VENV_BIN}/python" -V 2>&1)"
    echo "UVICORN: $("${VENV_BIN}/python" -m uvicorn --version 2>&1 || echo 'n/a')"
    echo
    echo "## pip freeze"
    "${VENV_BIN}/pip" freeze 2>/dev/null || echo "(pip freeze failed)"
  } > "${OUT}"

  info "Wrote snapshot: ${OUT}"
}

cmd_env() {
  cat <<EOF
ROOT_DIR = ${ROOT_DIR}
APP_DIR  = ${APP_DIR}
ENV_FILE = ${ENV_FILE}
VENV_DIR = ${VENV_DIR}
VENV_BIN = ${VENV_BIN}
HOST     = ${HOST}
PORT     = ${PORT}
RELOAD   = ${RELOAD}
HEALTH   = ${HEALTH_URL}
PYTHON   = ${PYTHON_BIN}
EOF

  if [ -f "${ENV_FILE}" ]; then
    echo
    echo ".env (non-secret preview; first 20 lines)"
    head -n 20 "${ENV_FILE}" || true
  else
    echo
    echo "No .env found at ${ENV_FILE} (optional)."
  fi
}

main() {
  cd "${ROOT_DIR}"

  case "${1:-}" in  # shellcheck disable=SC1073,SC1083
    help|-h|--help)
      usage
      ;;
    init)
      cmd_init
      ;;
    install)
      cmd_install
      ;;
    run)
      cmd_run
      ;;
    health)
      cmd_health
      ;;
    freeze)
      cmd_freeze
      ;;
    env)
      cmd_env
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

# shellcheck disable=SC2128
main "$@"
