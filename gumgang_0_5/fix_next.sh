#!/usr/bin/env bash
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="${ROOT}/gumgang-v2"
RUNLOG="${ROOT}/logs/runtime"; mkdir -p "$RUNLOG"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] Next.js 정리(lockfile 격리+swcMinify 제거+캐시 삭제+재빌드/재시작) 진행? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || exit 0

[[ -f "$HOME/package-lock.json" ]] && mv "$HOME/package-lock.json" "$HOME/package-lock.json.bak.$TS"

if [[ -f "${APP}/next.config.ts" ]] && grep -q 'swcMinify' "${APP}/next.config.ts"; then
  cp "${APP}/next.config.ts" "${APP}/next.config.ts.bak.${TS}"
  sed -E -i 's/^\s*swcMinify\s*:\s*true\s*,?/\/\* removed for Next15 \*\//g' "${APP}/next.config.ts"
fi

rm -rf "${APP}/.next"
cd "${APP}"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build
PORT=3000 npm run start 2>&1 | tee -a "${RUNLOG}/fe_3000_${TS}.log"
