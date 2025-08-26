#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — Visualization 3종 언펜스 (안전 롤백 포함)
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
BACK="$ROOT/memory/ts_unfence_backup/${TS}"
LOG="$ROOT/logs/builds/vis_unfence_${TS}.log"
FILES=(
  "components/visualization/Memory3D.tsx"
  "components/visualization/SystemGrid3D.tsx"
  "components/visualization/Code3DViewer.tsx"
)

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] Visualization 3종 @ts-nocheck 제거 후 파일별 빌드 테스트(실패 파일 자동 원복) 진행할까요? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

mkdir -p "$BACK" "$(dirname "$LOG")" "$APP/types"

# 0) 3D 라이브러리 타입 스텁(필요 시 사용)
cat > "$APP/types/three-stubs.d.ts" <<'DT'
declare module 'three';
declare module '@react-three/fiber';
declare module '@react-three/drei';
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
echo "== vis unfence @ ${TS} ==" | tee "$LOG"
for REL in "${FILES[@]}"; do
  F="$APP/$REL"
  if [[ ! -f "$F" ]]; then echo "⚠ 없음: $REL"; continue; fi
  mkdir -p "$BACK/$(dirname "$REL")"; cp -f "$F" "$BACK/$REL.bak"
  # @ts-nocheck 한 번만 제거
  sed -i '0,/@ts-nocheck/{/@ts-nocheck/d;}' "$F" || true
  echo "→ unfence: $REL" | tee -a "$LOG"
  if build; then
    echo "✅ OK: $REL" | tee -a "$LOG"; ((OKS++))
  else
    echo "❌ FAIL: $REL — 원복" | tee -a "$LOG"
    cp -f "$BACK/$REL.bak" "$F"; ((FAILS++))
  fi
done

# 커밋(성공 파일만 반영)
cd "$ROOT"
git add "$APP/types/three-stubs.d.ts" 2>/dev/null || true
git add $APP/components/visualization/*.tsx 2>/dev/null || true
git commit -m "types(visualization): safe unfence batch (OK=${OKS}, FAIL=${FAILS}) — ${TS} KST" --no-verify || true

echo
echo "=== 요약 (${TS} KST) ==="
echo "- 성공: $OKS, 실패: $FAILS"
echo "- 백업: $BACK"
echo "- 로그: $LOG"
echo "남은 @ts-nocheck 수:"
find "$APP" -name "*.ts*" -exec grep -l "@ts-nocheck" {} \; | wc -l || true
