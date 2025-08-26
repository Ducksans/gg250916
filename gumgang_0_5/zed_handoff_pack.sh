#!/usr/bin/env bash
# Gumgang 2.0 — Zed Handoff Pack (FE 유지, Guard 실행, 크론 정렬, 스냅샷)
set -euo pipefail
ROOT="$HOME/바탕화면/gumgang_0_5"
APP="$ROOT/gumgang-v2"
MET="$ROOT/logs/metrics"; RUN="$ROOT/logs/runtime"; SESS="$ROOT/logs/sessions"
GUARD="$ROOT/tools/guard_validate_all.sh"; VSH="$ROOT/tools/validate_canon_docs.sh"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')"
MARK_HOURLY="# Gumgang:canon-validate-hourly"
MARK_DAILY="# Gumgang:guard-daily"

# TTY 가드(요약재생 자동승인 방지)
[[ -t 0 ]] || { echo "non-interactive; abort"; exit 1; }

mkdir -p "$MET" "$RUN" "$SESS"

echo "[ASK APPROVAL] FE(3000) 백그라운드 유지 + Guard 1회 실행 + 크론 정렬 + 스냅샷 생성 진행할까요? (yes/no)"
read -r OK </dev/tty; [[ "$OK" =~ ^(y|yes)$ ]] || { echo "중단"; exit 0; }

# 1) FE(3000) 가동 보장
if ! lsof -ti :3000 >/dev/null 2>&1; then
  pushd "$APP" >/dev/null
  FELOG="$RUN/fe_3000_${TS}.log"
  PORT=3000 nohup npm run start > "$FELOG" 2>&1 & echo $! > "$RUN/fe_3000.pid"
  popd >/dev/null
fi

# 2) Guard 1회 실행 + 로그 표준화
chmod +x "$GUARD" "$VSH" 2>/dev/null || true
"$GUARD" || true
# guard 스크립트가 validation_*로만 남겼을 수 있어 표준 로그로 카피
LAST_VAL="$(ls -t "$ROOT"/logs/validation_*.log 2>/dev/null | head -1 || true)"
[[ -n "$LAST_VAL" ]] && cp -f "$LAST_VAL" "$MET/guard_validate_all.log"

# 3) 크론 정렬(매시 무결성, 매일 23:55 올인원)
CRONTAB_CUR="$(crontab -l 2>/dev/null || true)"
if ! grep -Fq "$MARK_HOURLY" <<< "$CRONTAB_CUR"; then
  (crontab -l 2>/dev/null; echo "0 * * * * $VSH >> $ROOT/logs/metrics/canon_validation.log 2>&1 $MARK_HOURLY") | crontab -
fi
if ! grep -Fq "$MARK_DAILY" <<< "$CRONTAB_CUR"; then
  (crontab -l 2>/dev/null; echo "55 23 * * * $GUARD >> $ROOT/logs/metrics/guard_validate_all.log 2>&1 $MARK_DAILY") | crontab -
fi

# 4) 스냅샷(상태 요약) 생성
SNAP="$SESS/handover_${TS}.md"
BE_HEALTH="$(curl -s http://localhost:8000/health || echo '{}')"
FE_UP=$([[ $(lsof -ti :3000 | wc -l) -gt 0 ]] && echo "running" || echo "stopped")
cat > "$SNAP" <<EOF
# Handover Snapshot — KST ${TS}
- FE 3000: ${FE_UP} (pid: $(cat "$RUN/fe_3000.pid" 2>/dev/null || echo '-'))
- BE 8000 /health: ${BE_HEALTH}
- WS: OFF (env .env.local)
- Canon cron: $(crontab -l | grep -F "$MARK_HOURLY" || echo 'missing')
- Guard cron: $(crontab -l | grep -F "$MARK_DAILY" || echo 'missing')
- Guard log: $ROOT/logs/metrics/guard_validate_all.log
EOF

# 5) (선택) WS PoC 토글
echo "[ASK APPROVAL] 지금 WS PoC를 켤까요? .env.local에 WS URL 설정 후 재빌드/재시작합니다. (yes/no)"
read -r WSOK </dev/tty
if [[ "$WSOK" =~ ^(y|yes)$ ]]; then
  pushd "$APP" >/dev/null
  printf "NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws\n" >> .env.local
  npm run build
  kill $(lsof -ti :3000) 2>/dev/null || true; sleep 1
  kill -9 $(lsof -ti :3000) 2>/dev/null || true
  PORT=3000 nohup npm run start > "$RUN/fe_3000_${TS}_ws.log" 2>&1 & echo $! > "$RUN/fe_3000.pid"
  popd >/dev/null
fi

echo "== 완료 =="
echo "Snapshot: $SNAP"
echo "Logs: $MET/guard_validate_all.log, $ROOT/logs/metrics/canon_validation.log"
