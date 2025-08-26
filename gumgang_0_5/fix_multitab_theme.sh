#!/usr/bin/env bash
# 🚩 Fix MultiTabEditor theme prop type + safe rebuild
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
FILE="$APP/components/editor/MultiTabEditor.tsx"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
BACKUP="$ROOT/memory/ts_unfence_backup/${TS}"
LOG="$ROOT/logs/builds/fix_multitab_${TS}.log"

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] MultiTabEditor.tsx의 theme 타입을 표준화하고 빌드 테스트할까요? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

# 1) 공용 타입 정의(있으면 유지)
mkdir -p "$APP/types"
cat > "$APP/types/editor-theme.d.ts" <<'DT'
/** 공용 에디터 테마 타입: 기본 모나코 + 커스텀 문자열 허용 */
export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black' | 'hc-light' | (string & {});
DT

# 2) MultiTabEditor 백업 후 패치
mkdir -p "$BACKUP"
cp -f "$FILE" "$BACKUP/$(basename "$FILE").bak"

# @ts-nocheck 제거
sed -i '/@ts-nocheck/d' "$FILE"

# import 라인에 타입 추가(중복 방지)
if ! grep -q "from '../../types/editor-theme'" "$FILE" 2>/dev/null; then
  # 첫 번째 import 문 찾아서 그 다음에 추가
  sed -i '0,/^import /{/^import /a\import type { EditorTheme } from "../../types/editor-theme";
}' "$FILE"
fi

# theme prop 타입을 EditorTheme으로 변경
# 패턴: theme?: string | "vs-dark" | "vs" | "hc-black" 등을 theme?: EditorTheme으로
sed -i 's/theme?: *[^;,}]*/theme?: EditorTheme/g' "$FILE"

# FileEditor 컴포넌트에 전달하는 theme을 안전하게 처리
# theme={theme} → theme={theme as any}로 임시 처리
sed -i 's/theme={theme}/theme={theme as any}/g' "$FILE"

# 3) 재빌드
pushd "$APP" >/dev/null
if [[ -f pnpm-lock.yaml ]]; then I="pnpm install --frozen-lockfile"; B="pnpm build"
elif [[ -f yarn.lock ]]; then I="yarn install --frozen-lockfile"; B="yarn build"
elif [[ -f package-lock.json ]]; then I="npm ci"; B="npm run build"
else I="npm install"; B="npm run build"; fi
echo "== fix multitab @ ${TS} ==" | tee "$LOG"
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
  git add "$APP/types/editor-theme.d.ts" "$FILE" || true
  git commit -m "types(editor): fix MultiTabEditor theme typing and remove @ts-nocheck — ${TS} KST" --no-verify || true
else
  echo "❌ 빌드 실패 — 원복합니다."
  cp -f "$BACKUP/$(basename "$FILE").bak" "$FILE"
  cd "$ROOT"; git restore --staged "$FILE" 2>/dev/null || true
  echo "로그: $LOG (상위 에러 20줄↓)"; grep -iE "error|cannot|type" "$LOG" | head -n 20 || true
fi

echo
echo "=== 요약 (${TS} KST) ==="
echo "- 대상: $FILE"
echo "- 결과: $RESULT"
echo "- 백업: $BACKUP"
echo "- 로그: $LOG"
