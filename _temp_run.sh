#!/bin/bash
# Deprecated helper — delegates to start_servers.sh

set -e

SCRIPT_ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "[DEPRECATED] _temp_run.sh 는 임시 디버그 스크립트였습니다." >&2
echo "            ./start_servers.sh 를 직접 실행하세요." >&2

exec "${SCRIPT_ROOT}/start_servers.sh"
