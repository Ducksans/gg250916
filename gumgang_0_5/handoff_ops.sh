#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
METRIC_LOG_DIR="$ROOT/logs/metrics"
RUNTIME_LOG_DIR="$ROOT/logs/runtime"
GUARD="$ROOT/tools/guard_validate_all.sh"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
MARK="# Gumgang:guard-daily"

# TTY 가드(요약 재생 자동승인 방지)
[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }
echo "[ASK APPROVAL] FE 백그라운드 시작(3000) + guard 1회 실행 + guard 크론(23:55) 등록 진행할까요? (yes/no)"
read -r OK </dev/tty
[[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

mkdir -p "$RUNTIME_LOG_DIR" "$METRIC_LOG_DIR"

echo "→ FE(3000) 재기동"
if lsof -ti :3000 >/dev/null 2>&1; then
  kill $(lsof -ti :3000) 2>/dev/null || true
  sleep 1
  kill -9 $(lsof -ti :3000) 2>/dev/null || true
fi
pushd "$APP" >/dev/null
FELOG="$RUNTIME_LOG_DIR/fe_3000_${TS}.log"
PORT=3000 nohup npm run start > "$FELOG" 2>&1 & echo $! > "$RUNTIME_LOG_DIR/fe_3000.pid"
popd >/dev/null
echo "   PID: $(cat "$RUNTIME_LOG_DIR/fe_3000.pid")  LOG: $FELOG"

echo "→ guard 1회 실행"
chmod +x "$GUARD" 2>/dev/null || true
"$GUARD" || true

echo "→ guard 크론 등록(23:55)"
( crontab -l 2>/dev/null | grep -v 'Gumgang:guard-daily'; \
  echo "55 23 * * * $GUARD >> $METRIC_LOG_DIR/guard_validate_all.log 2>&1 $MARK" ) | crontab -

echo
echo "=== 요약($TS KST) ==="
echo "- FE 3000: running (pid $(cat "$RUNTIME_LOG_DIR/fe_3000.pid"))"
echo "- FE log:  $FELOG"
echo "- Guard log: $METRIC_LOG_DIR/guard_validate_all.log"
echo "- 크론: $(crontab -l | grep 'Gumgang:guard-daily' || echo '등록 확인 필요')"
echo
echo "[HINT] 최근 FAIL/WARN:"
tail -n 200 "$METRIC_LOG_DIR/guard_validate_all.log" 2>/dev/null | grep -E '\[FAIL\]|\[WARN\]' || echo "없음"
