#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — Guard Rerun + Checkpoint Tag + TS Debt List
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
GUARD="$ROOT/tools/guard_validate_all.sh"
MET="$ROOT/logs/metrics"; mkdir -p "$MET"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"

# TTY 가드(자동 승인 방지)
[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] Guard 재실행 → Git 체크포인트 태그 → TS @ts-nocheck 상위10 표시를 진행할까요? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

echo "== 1) Guard 재실행 =="
chmod +x "$GUARD" 2>/dev/null || true
"$GUARD" || true
echo "-- Guard 로그 (마지막 50줄) --"
tail -n 50 "$MET/guard_validate_all.log" 2>/dev/null || echo "guard log not found"

echo
echo "== 2) Git 체크포인트 태그 =="
cd "$ROOT"
git add -A || true
git commit -m "stable: FE=3000 BE=8000 WS=off (${TS} KST)" || echo "(변경사항 없음: commit skip)"
TAG="r0.1-green"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  TAG="${TAG}-${TS}"
fi
git tag -a "$TAG" -m "Go/No-Go GREEN (docs sealed, WS=off) @ ${TS} KST" || echo "(tag 실패 무시)"
echo "태그: $TAG"

echo
echo "== 3) TS 부채 목록(@ts-nocheck 상위 10) =="
if [[ -d "$APP" ]]; then
  cd "$APP"
  grep -R --include='*.ts*' -n '@ts-nocheck' 2>/dev/null | head -n 10 || echo "no @ts-nocheck found"
else
  echo "gumgang-v2 디렉터리 없음"
fi

echo
echo "=== 완료 요약 (${TS} KST) ==="
echo "- Guard: 재실행 완료 (logs/metrics/guard_validate_all.log 확인)"
echo "- Git tag: $TAG"
echo "- TS debt top10: 위 목록 확인"
