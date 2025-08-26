#!/usr/bin/env bash
# preflight.sh — Gumgang preflight for venv availability and port conflicts
# Scope:
#   - Check project-local Python venv presence and minimal deps (FastAPI, Uvicorn, multipart)
#   - Check port conflicts for Bridge(3037) and Backend(8000)
# Behavior:
#   - Read-only; does not start/stop any service
#   - Exit 0 when all checks pass; non-zero on failure
#
# Usage:
#   chmod +x scripts/preflight.sh
#   scripts/preflight.sh
#   PORT_BRIDGE=3037 PORT_BACKEND=8000 VENV_DIR=/path/to/venv scripts/preflight.sh
#   scripts/preflight.sh --json   # machine-readable summary

set -euo pipefail

# ---------- Config ----------
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PORT_BRIDGE="${PORT_BRIDGE:-3037}"
PORT_BACKEND="${PORT_BACKEND:-8000}"
VENV_DIR="${VENV_DIR:-${ROOT_DIR}/venv}"
VENV_BIN="${VENV_DIR}/bin"
PY_BIN="${VENV_BIN}/python"

# ---------- Helpers ----------
have_cmd() { command -v "$1" >/dev/null 2>&1; }
bold() { printf "\033[1m%s\033[0m" "$*"; }
ok() { printf "[ OK ] %s\n" "$*"; }
warn() { printf "[WARN] %s\n" "$*" >&2; }
err() { printf "[FAIL] %s\n" "$*" >&2; }

# Try multiple tools to detect listeners on a TCP port
check_port_in_use() {
  local port="$1"
  local out=""
  if have_cmd ss; then
    out="$(ss -H -ltnp 2>/dev/null | awk -v p=":${port}" '$4 ~ p {print}')"
    if [ -n "${out}" ]; then
      echo "ss:${out}"
      return 0
    fi
  fi
  if have_cmd lsof; then
    out="$(lsof -nP -i TCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "${out}" ]; then
      echo "lsof:${out}"
      return 0
    fi
  fi
  if have_cmd netstat; then
    out="$(netstat -tulnp 2>/dev/null | awk -v p=":${port}" '$0 ~ p {print}')"
    if [ -n "${out}" ]; then
      echo "netstat:${out}"
      return 0
    fi
  fi
  return 1
}

json_escape() {
  python3 - <<'PY' 2>/dev/null || printf '%s' "$1"
import json,sys
print(json.dumps(sys.stdin.read().rstrip()))
PY
}

# ---------- Checks ----------
FAIL=0
JSON="${1:-}"

echo "== Gumgang Preflight =="
echo "ROOT_DIR     : ${ROOT_DIR}"
echo "VENV_DIR     : ${VENV_DIR}"
echo "PORT_BRIDGE  : ${PORT_BRIDGE}"
echo "PORT_BACKEND : ${PORT_BACKEND}"
echo

# 1) Venv presence
if [ -d "${VENV_DIR}" ] && [ -x "${PY_BIN}" ]; then
  ok "venv found at ${VENV_DIR}"
else
  err "venv not found at ${VENV_DIR}"
  warn "Create it with: python3 -m venv \"${VENV_DIR}\" && \"${VENV_BIN}/python\" -m pip install -U pip"
  FAIL=$((FAIL+1))
fi

# 2) Minimal Python deps inside venv
DEPS_OK="unknown"
UVICORN_VER="n/a"
if [ -x "${PY_BIN}" ]; then
  if "${PY_BIN}" - <<'PY' >/dev/null 2>&1; then
import importlib
for m in ("fastapi","uvicorn","multipart"):
    importlib.import_module(m)
PY
  then
    DEPS_OK="true"
    ok "python deps: fastapi, uvicorn, multipart (OK)"
    # Try getting uvicorn version
    UVICORN_VER="$("${PY_BIN}" -c 'import uvicorn; print(getattr(uvicorn,"__version__","n/a"))' 2>/dev/null || echo 'n/a')"
  else
    DEPS_OK="false"
    err "python deps missing in venv (need: fastapi, uvicorn, python-multipart)"
    warn "Install: \"${VENV_BIN}/pip\" install \"fastapi>=0.110\" \"uvicorn[standard]>=0.23\" \"python-multipart>=0.0.9\""
    FAIL=$((FAIL+1))
  fi
else
  DEPS_OK="false"
fi

# 3) Port conflicts
BRIDGE_OK="true"; BRIDGE_WHO=""; BACKEND_OK="true"; BACKEND_WHO=""
if out="$(check_port_in_use "${PORT_BRIDGE}")"; then
  BRIDGE_OK="false"; BRIDGE_WHO="${out}"
  err "port ${PORT_BRIDGE} in use"
  printf "       details: %s\n" "${out}" >&2
  FAIL=$((FAIL+1))
else
  ok "port ${PORT_BRIDGE} free"
fi

if out="$(check_port_in_use "${PORT_BACKEND}")"; then
  BACKEND_OK="false"; BACKEND_WHO="${out}"
  err "port ${PORT_BACKEND} in use"
  printf "       details: %s\n" "${out}" >&2
  FAIL=$((FAIL+1))
else
  ok "port ${PORT_BACKEND} free"
fi

# ---------- JSON summary (optional) ----------
if [ "${JSON}" = "--json" ]; then
  BR_ESC="$(printf '%s' "${BRIDGE_WHO}" | json_escape)"
  BE_ESC="$(printf '%s' "${BACKEND_WHO}" | json_escape)"
  printf '{'
  printf '"root_dir":%s,' "$(printf '%s' "${ROOT_DIR}" | json_escape)"
  printf '"venv_dir":%s,' "$(printf '%s' "${VENV_DIR}" | json_escape)"
  printf '"venv_present":%s,' "$([ -x "${PY_BIN}" ] && echo true || echo false)"
  printf '"deps_ok":%s,' "$([ "${DEPS_OK}" = "true" ] && echo true || echo false)"
  printf '"uvicorn_version":%s,' "$(printf '%s' "${UVICORN_VER}" | json_escape)"
  printf '"bridge":{"port":%s,"free":%s,"who":%s},' "${PORT_BRIDGE}" "$([ "${BRIDGE_OK}" = "true" ] && echo true || echo false)" "${BR_ESC}"
  printf '"backend":{"port":%s,"free":%s,"who":%s},' "${PORT_BACKEND}" "$([ "${BACKEND_OK}" = "true" ] && echo true || echo false)" "${BE_ESC}"
  printf '"ok":%s' "$([ "${FAIL}" -eq 0 ] && echo true || echo false)"
  printf '}\n'
fi

echo
if [ "${FAIL}" -eq 0 ]; then
  ok "Preflight passed"
  exit 0
else
  err "Preflight failed (${FAIL} issue(s) found)"
  echo "Hints:"
  echo "  - Create/repair venv: scripts/dev_backend.sh init"
  echo "  - Free ports ${PORT_BRIDGE}/${PORT_BACKEND} or override via env: PORT_BRIDGE=xxxx PORT_BACKEND=yyyy"
  echo "  - Run health: scripts/dev_backend.sh health"
  exit 1
fi
