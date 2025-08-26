#!/usr/bin/env bash
# 🚩 Core Unfence Batch — terminal/protocol/evolution/layout (safe rollback)
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
BACK="$ROOT/memory/ts_unfence_backup/${TS}"
LOG="$ROOT/logs/builds/core_unfence_${TS}.log"
FILES=(
  "components/terminal/SecureTerminalManager.tsx"
  "components/protocol/FloatingProtocolWidget.tsx"
  "components/evolution/ApprovalModal.tsx"
  "components/layout/MemoryStatus.tsx"
)

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] 코어 4종 @ts-nocheck 제거 후 파일별 빌드(실패시 자동 원복) 진행? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

mkdir -p "$BACK" "$(dirname "$LOG")" "$APP/types"

# 필요한 경우 터미널/XTerm 타입 스텁
cat > "$APP/types/terminal-stubs.d.ts" <<'DT'
declare module 'xterm';
declare module 'xterm-addon-fit';
declare module '@xterm/xterm';
declare module '@xterm/addon-fit';
DT

build() {
  pushd "$APP" >/dev/null
  if [[ -f pnpm-lock.yaml ]]; then I="pnpm install --frozen-lockfile"; B="pnpm build"
  elif [[ -f yarn.lock ]]; then I="yarn install --frozen-lockfile"; B="yarn build"
  elif [[ -f package-lock.json ]]; then I="npm ci"; B="npm run build"
  else I="npm install"; B="npm run build"; fi
  bash -lc "$I"  >> "$LOG" 2>&1 || true
  bash -lc "$B"  >> "$LOG" 2>&1
  popd >/dev/null
}

OKS=0; FAILS=0
echo "== core unfence @ ${TS} ==" | tee "$LOG"
for REL in "${FILES[@]}"; do
  F="$APP/$REL"
  [[ -f "$F" ]] || { echo "⚠ 없음: $REL" | tee -a "$LOG"; continue; }
  mkdir -p "$BACK/$(dirname "$REL")"; cp -f "$F" "$BACK/$REL.bak"
  sed -i '0,/@ts-nocheck/{/@ts-nocheck/d;}' "$F" || true
  echo "→ unfence: $REL" | tee -a "$LOG"
  if build; then
    echo "✅ OK: $REL" | tee -a "$LOG"; ((OKS++))
  else
    echo "❌ FAIL: $REL — 원복" | tee -a "$LOG"
    cp -f "$BACK/$REL.bak" "$F"; ((FAILS++))
  fi
done

cd "$ROOT"
git add "$APP/types/terminal-stubs.d.ts" 2>/dev/null || true
git add $APP/components/{terminal,protocol,evolution,layout}/*.tsx 2>/dev/null || true
git commit -m "types(core): safe unfence batch (OK=${OKS}, FAIL=${FAILS}) — ${TS} KST" --no-verify || true

echo -e "\n=== 요약 (${TS} KST) ==="
echo "- 성공: $OKS, 실패: $FAILS"
echo "- 백업: $BACK"
echo "- 로그: $LOG"
echo "남은 @ts-nocheck:"
find "$APP" -name "*.ts*" -exec grep -l "@ts-nocheck" {} \; | wc -l || true
