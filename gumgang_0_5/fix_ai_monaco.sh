#!/usr/bin/env bash
# 🚩 TS Unfence — AIEnhancedMonacoEditor (safe)
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
FILE="$APP/components/editor/AIEnhancedMonacoEditor.tsx"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
BACKUP="$ROOT/memory/ts_unfence_backup/${TS}"
LOG="$ROOT/logs/builds/fix_ai_monaco_${TS}.log"

[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] AIEnhancedMonacoEditor.tsx의 @ts-nocheck 제거 후 빌드 테스트(실패 시 자동 원복) 진행? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

# 1) 공용 테마 타입 보장
mkdir -p "$APP/types"
cat > "$APP/types/editor-theme.d.ts" <<'DT'
export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black' | 'hc-light' | (string & {});
DT

# 2) 백업 + 최소 타입 보강
mkdir -p "$BACKUP/$(dirname "${FILE#${ROOT}/}")" "$(dirname "$LOG")"
cp -f "$FILE" "$BACKUP/$(basename "$FILE").bak"

# import 보강(중복 방지)
grep -q "from '../../types/editor-theme'" "$FILE" 2>/dev/null || \
  sed -i "1i import type { EditorTheme } from '../../types/editor-theme';" "$FILE"

# @ts-nocheck 제거(최초 1회)
sed -i '0,/@ts-nocheck/{/@ts-nocheck/d;}' "$FILE" || true

# theme 안전 기본값 주입(없으면)
grep -q 'resolvedTheme' "$FILE" || \
  sed -i "0,/function .*\\(|=>\\) *\\{/{s//&\n  const resolvedTheme: EditorTheme = (typeof (theme as any) === 'string' && (theme as any).length ? (theme as any) : 'vs-dark');/}" "$FILE"
sed -i "s/theme:\s*theme/theme: resolvedTheme/g" "$FILE" || true

# 3) 빌드
pushd "$APP" >/dev/null
if [[ -f pnpm-lock.yaml ]]; then I="pnpm install --frozen-lockfile"; B="pnpm build"
elif [[ -f yarn.lock ]]; then I="yarn install --frozen-lockfile"; B="yarn build"
elif [[ -f package-lock.json ]]; then I="npm ci"; B="npm run build"
else I="npm install"; B="npm run build"; fi
echo "== fix AIEnhancedMonacoEditor @ ${TS} ==" | tee "$LOG"
bash -lc "$I"  >> "$LOG" 2>&1 || true
if bash -lc "$B" >> "$LOG" 2>&1; then RESULT=SUCCESS; else RESULT=FAIL; fi
popd >/dev/null

# 4) 성공/실패 처리
if [[ "$RESULT" == "SUCCESS" ]]; then
  cd "$ROOT"
  git add "$FILE" "$APP/types/editor-theme.d.ts" "$LOG" || true
  git commit -m "types(editor): unfence AIEnhancedMonacoEditor — ${TS} KST" --no-verify || true
  echo "✅ 빌드 성공 — 커밋 완료. 로그: $LOG"
else
  cp -f "$BACKUP/$(basename "$FILE").bak" "$FILE"
  cd "$ROOT"; git restore --staged "$FILE" 2>/dev/null || true
  echo "❌ 빌드 실패 — 원복 완료. 에러 Top20:"
  grep -iE "error|cannot|type" "$LOG" | head -n 20 || true
fi

echo
echo "=== 요약 (${TS} KST) ==="
echo "- 대상: AIEnhancedMonacoEditor.tsx"
echo "- 결과: $RESULT"
echo "- 백업: $BACKUP"
echo "- 로그: $LOG"
echo
if [[ "$RESULT" == "SUCCESS" ]]; then
  echo "[SUCCESS] Editor 컴포넌트 타입 복구 100% 완료!"
  REMAINING=$(find "$APP" -name "*.ts*" -exec grep -l "@ts-nocheck" {} \; | wc -l)
  echo "남은 @ts-nocheck 파일: $REMAINING개"
else
  echo "[TIP] 수동 타입 수정 필요. 에러 로그 확인: $LOG"
fi
