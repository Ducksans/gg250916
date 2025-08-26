#!/usr/bin/env bash
# 🚩 FE Build Smoke Test (WRITE) — .rules 불가침, 로그 보관
set -euo pipefail
ROOT="/home/duksan/바탕화면/gumgang_0_5"
LOGDIR="${ROOT}/logs/builds"; mkdir -p "$LOGDIR"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"

echo "[ASK APPROVAL] 프론트엔드 빌드 테스트를 진행할까요? (yes/no)"
read -r OK; [[ "${OK:-no}" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

# 대상 선택: gumgang-v2 우선, 없으면 첫 package.json
if [[ -f "${ROOT}/gumgang-v2/package.json" ]]; then DIR="${ROOT}/gumgang-v2"
else
  DIR="$(find "${ROOT}" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | sort | head -n1 | xargs -r dirname)"
fi
[[ -n "${DIR:-}" ]] || { echo "package.json 미발견"; exit 2; }

# 패키지 매니저 결정
if [[ -f "${DIR}/pnpm-lock.yaml" ]]; then I="pnpm install --frozen-lockfile"; B="pnpm build"
elif [[ -f "${DIR}/yarn.lock" ]]; then I="yarn install --frozen-lockfile"; B="yarn build"
elif [[ -f "${DIR}/package-lock.json" ]]; then I="npm ci"; B="npm run build"
else I="npm install"; B="npm run build"; fi

REL="${DIR#${ROOT}/}"; LOG="${LOGDIR}/build_${REL//\//_}_${TS}.log"
pushd "$DIR" >/dev/null
echo "== [$REL] install+build @ ${TS} ==" | tee "$LOG"
bash -lc "$I"  >> "$LOG" 2>&1 || { echo "❌ install 실패: $REL (로그: $LOG)"; exit 1; }
bash -lc "$B"  >> "$LOG" 2>&1 || { echo "❌ build 실패: $REL (로그: $LOG)";  exit 2; }
popd >/dev/null
echo "✅ 빌드 성공: $REL"; echo "로그: $LOG"
echo "[NEXT] policy_model.md 핵심 규칙 고정 → guard_validate_all.sh 스켈레톤"
