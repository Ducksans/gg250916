#!/bin/bash

# 금강 2.0 프론트엔드 시작 스크립트
# Frontend Start Script for Gumgang 2.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/gumgang-v2"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 함수: 프론트엔드 상태 확인
check_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is running (PID: $PID)${NC}"
            echo -e "${GREEN}📍 URL: http://localhost:3000${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️ PID file exists but process is not running${NC}"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        echo -e "${RED}❌ Frontend is not running${NC}"
        return 1
    fi
}

# 함수: 프론트엔드 시작
start_frontend() {
    echo -e "${YELLOW}🚀 Starting Gumgang 2.0 Frontend...${NC}"

    # 이미 실행 중인지 확인
    if check_status > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Frontend is already running${NC}"
        return 1
    fi

    # 프론트엔드 디렉토리 확인
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
        return 1
    fi

    # 프론트엔드 시작
    cd "$FRONTEND_DIR"

    # 환경 변수 확인 및 업데이트
    if [ -f ".env.local" ]; then
        # 백엔드 포트를 8000으로 업데이트
        sed -i 's/localhost:8001/localhost:8000/g' .env.local
        echo -e "${GREEN}✅ Updated backend URL to port 8000${NC}"
    fi

    # npm 의존성 설치 (필요한 경우)
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install --silent
    fi

    # 백그라운드에서 시작
    echo -e "${YELLOW}🔧 Starting Next.js development server...${NC}"
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"

    # 시작 확인 (최대 10초 대기)
    for i in {1..10}; do
        sleep 1
        if grep -q "Ready in" "$LOG_FILE" 2>/dev/null; then
            echo -e "${GREEN}✅ Frontend started successfully!${NC}"
            echo -e "${GREEN}📍 Local: http://localhost:3000${NC}"
            echo -e "${GREEN}📋 PID: $PID${NC}"
            echo -e "${GREEN}📁 Logs: $LOG_FILE${NC}"

            # 포트 확인
            PORT=$(grep -oP "localhost:\d+" "$LOG_FILE" | head -1 | cut -d: -f2)
            if [ "$PORT" != "3000" ]; then
                echo -e "${YELLOW}⚠️ Note: Running on port $PORT instead of 3000${NC}"
            fi
            return 0
        fi
        echo -n "."
    done

    echo ""
    echo -e "${RED}❌ Frontend failed to start. Check logs: $LOG_FILE${NC}"
    tail -20 "$LOG_FILE"
    return 1
}

# 함수: 프론트엔드 중지
stop_frontend() {
    echo -e "${YELLOW}🛑 Stopping frontend...${NC}"

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            sleep 2
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID"
            fi
            rm -f "$PID_FILE"
            echo -e "${GREEN}✅ Frontend stopped${NC}"
        else
            echo -e "${YELLOW}⚠️ Process not found, cleaning up PID file${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️ Frontend is not running${NC}"
    fi

    # 추가로 next dev 프로세스 정리
    pkill -f "next dev" 2>/dev/null
}

# 함수: 로그 보기
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo -e "${RED}❌ Log file not found: $LOG_FILE${NC}"
    fi
}

# 함수: 재시작
restart_frontend() {
    stop_frontend
    sleep 2
    start_frontend
}

# 메인 명령어 처리
case "$1" in
    start)
        start_frontend
        ;;
    stop)
        stop_frontend
        ;;
    restart)
        restart_frontend
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the frontend development server"
        echo "  stop    - Stop the frontend"
        echo "  restart - Restart the frontend"
        echo "  status  - Check if frontend is running"
        echo "  logs    - View frontend logs (tail -f)"
        exit 1
        ;;
esac
