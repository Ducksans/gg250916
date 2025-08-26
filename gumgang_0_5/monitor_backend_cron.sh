#!/bin/bash
# Gumgang Backend 모니터링 (Cron)
# 5분마다 실행되어 백엔드 상태 확인

# Source time_kr.sh for KST timestamps
source /home/duksan/바탕화면/gumgang_0_5/scripts/time_kr.sh

LOG_FILE="/home/duksan/바탕화면/gumgang_0_5/backend/logs/monitor.log"

# 백엔드 체크 및 자동 재시작
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "$(now_kr_minute) - Backend down, restarting..." >> "$LOG_FILE"
    /home/duksan/바탕화면/gumgang_0_5/auto_start_backend.sh start >> "$LOG_FILE" 2>&1
else
    # 정상 작동 로그 (하루에 한 번만)
    HOUR=$(now_kr_time | cut -d: -f1)
    if [ "$HOUR" = "09" ]; then
        LAST_LOG=$(tail -1 "$LOG_FILE" 2>/dev/null | grep "Backend OK" | cut -d' ' -f1)
        TODAY=$(now_kr_date)
        if [ "$LAST_LOG" != "$TODAY" ]; then
            echo "$(now_kr_minute) - Backend OK" >> "$LOG_FILE"
        fi
    fi
fi
