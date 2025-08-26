#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — TS Unfence (one file, safe) : @ts-nocheck 제거→빌드→성공 시 커밋, 실패 시 자동 되돌림
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
BACKUP="$ROOT/memory/ts_unfence_backup/${TS}"
LOG="$ROOT/logs/builds/ts_unfence_${TS}.log"
DEFAULT="$APP/components/editor/FileEditor.tsx"  # 우선순위 1

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] 상위 1개 파일의 @ts-nocheck를 제거해 보고, 빌드 성공 시 커밋(실패 시 자동 원복)할까요? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

# 1) 대상 선택 (기본: FileEditor.tsx)
TARGET="${1:-$DEFAULT}"
if [[ ! -f "$TARGET" ]]; then
  echo "대상 파일 미존재: $TARGET"; exit 2
fi
mkdir -p "$BACKUP" "$(dirname "$LOG")"
cp -f "$TARGET" "$BACKUP/$(basename "$TARGET").bak"

# 2) @ts-nocheck 제거(파일 상단 1회만)
if grep -q '@ts-nocheck' "$TARGET"; then
  sed -i '0,/@ts-nocheck/{/@ts-nocheck/d;}' "$TARGET"
  echo "→ unfence: $TARGET"
else
  echo "⚠ @ts-nocheck 없음: $TARGET (스킵 가능)"
fi

# 3) 빌드 시도
pushd "$APP" >/dev/null
if [[ -f pnpm-lock.yaml ]]; then I="pnpm install --frozen-lockfile"; B="pnpm build"
elif [[ -f yarn.lock ]]; then I="yarn install --frozen-lockfile"; B="yarn build"
elif [[ -f package-lock.json ]]; then I="npm ci"; B="npm run build"
else I="npm install"; B="npm run build"; fi
echo "== TS Unfence build @ ${TS} ==" | tee "$LOG"
bash -lc "$I"  >> "$LOG" 2>&1 || true
if bash -lc "$B" >> "$LOG" 2>&1; then
  RESULT=SUCCESS
else
  RESULT=FAIL
fi
popd >/dev/null

# 4) 성공/실패 처리
if [[ "$RESULT" == "SUCCESS" ]]; then
  echo "✅ 빌드 성공 — 커밋합니다."
  cd "$ROOT"
  git add "$TARGET" "$LOG" || true
  git commit -m "types: remove @ts-nocheck from $(realpath --relative-to="$ROOT" "$TARGET") (${TS} KST)" || true
else
  echo "❌ 빌드 실패 — 원복합니다."
  cp -f "$BACKUP/$(basename "$TARGET").bak" "$TARGET"
  cd "$ROOT"; git restore --staged "$TARGET" 2>/dev/null || true
fi

echo
echo "=== 요약 (${TS} KST) ==="
echo "- 대상: $TARGET"
echo "- 결과: $RESULT"
echo "- 백업: $BACKUP"
echo "- 로그: $LOG"
echo
echo "[TIP] 다른 파일 시도:  ./$(basename "$0") \"$APP/components/editor/CollaborativeEditor.tsx\""
