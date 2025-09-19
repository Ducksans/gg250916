#!/usr/bin/env bash
# DEPRECATED shim — delegates to start_servers.sh for backwards compatibility

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[DEPRECATED] scripts/dev_core_all_v5.sh 는 유지보수 대상이 아닙니다." >&2
echo "            대신 루트에서 ./start_servers.sh 를 실행하세요." >&2
if [ "$#" -gt 0 ]; then
  echo "            전달된 인자('$*')는 무시하고 start_servers.sh 를 실행합니다." >&2
fi

exec "${PROJECT_ROOT}/start_servers.sh"
