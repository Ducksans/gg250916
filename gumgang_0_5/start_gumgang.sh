#!/bin/bash

# 금강 2.0 통합 실행 스크립트
# Backend + Frontend 동시 실행

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/gumgang-v2"

# PID 파일 위치
PID_DIR="$PROJECT_ROOT/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 로그 파일 위치
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend_$(date +%Y%m%d_%H%M%S).log"
FRONTEND_LOG="$LOG_DIR/frontend_$(date +%Y%m%d_%H%M%S).log"

# 함수: 프로세스 종료
cleanup() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🛑 금강 2.0 종료 중...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Frontend 종료
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${CYAN}→ Frontend 서버 종료 중...${NC}"
            kill -TERM $FRONTEND_PID
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi

    # Backend 종료
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${CYAN}→ Backend 서버 종료 중...${NC}"
            kill -TERM $BACKEND_PID
            rm -f "$BACKEND_PID_FILE"
        fi
    fi

    # uvicorn 프로세스 정리
    pkill -f "uvicorn.*simple_main:app" 2>/dev/null

    echo -e "${GREEN}✓ 종료 완료${NC}"
    exit 0
}

# 함수: 포트 확인
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 포트 사용 중
    else
        return 1  # 포트 사용 가능
    fi
}

# 함수: 포트 정리
cleanup_port() {
    local port=$1
    local service=$2

    if check_port $port; then
        echo -e "${YELLOW}⚠ 포트 $port가 이미 사용 중입니다${NC}"
        echo -e "${CYAN}→ 기존 $service 프로세스를 종료하시겠습니까? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            kill $(lsof -Pi :$port -sTCP:LISTEN -t) 2>/dev/null
            sleep 2
            echo -e "${GREEN}✓ 포트 $port 정리 완료${NC}"
        else
            echo -e "${RED}✗ 시작 취소${NC}"
            exit 1
        fi
    fi
}

# 함수: Backend 서버 시작
start_backend() {
    echo -e "${CYAN}🔧 Backend 서버 시작 중...${NC}"

    cd "$BACKEND_DIR" || exit 1

    # Python 가상환경 활성화
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        echo -e "${RED}✗ Python 가상환경을 찾을 수 없습니다${NC}"
        echo -e "${YELLOW}→ 가상환경을 생성하시겠습니까? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
        else
            exit 1
        fi
    fi

    # 포트 정리
    cleanup_port 8000 "Backend"

    # Backend 서버 실행
    export PYTHONUNBUFFERED=1
    export PYTHONPATH="${PYTHONPATH}:$BACKEND_DIR"

    nohup uvicorn simple_main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"

    # 서버 시작 확인
    sleep 3
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${GREEN}✓ Backend 서버 시작됨 (PID: $BACKEND_PID)${NC}"
        echo -e "${BLUE}  → http://localhost:8000${NC}"
    else
        echo -e "${RED}✗ Backend 서버 시작 실패${NC}"
        cat "$BACKEND_LOG" | tail -20
        exit 1
    fi
}

# 함수: Frontend 서버 시작
start_frontend() {
    echo -e "${CYAN}🎨 Frontend 서버 시작 중...${NC}"

    cd "$FRONTEND_DIR" || exit 1

    # Node modules 확인
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}→ Node modules 설치 중...${NC}"
        npm install
    fi

    # 포트 정리
    cleanup_port 3000 "Frontend"

    # Frontend 서버 실행
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

    # 서버 시작 확인
    sleep 5
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${GREEN}✓ Frontend 서버 시작됨 (PID: $FRONTEND_PID)${NC}"
        echo -e "${BLUE}  → http://localhost:3000${NC}"
    else
        echo -e "${RED}✗ Frontend 서버 시작 실패${NC}"
        cat "$FRONTEND_LOG" | tail -20
        exit 1
    fi
}

# 함수: 브라우저 열기
open_browser() {
    echo -e "${CYAN}🌐 브라우저 열기...${NC}"

    # 잠시 대기 (서버 완전 시작)
    sleep 2

    # OS별 브라우저 열기
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "http://localhost:3000/chat" 2>/dev/null &
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:3000/chat" 2>/dev/null &
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        start "http://localhost:3000/chat" 2>/dev/null &
    fi
}

# 함수: 상태 모니터링
monitor_status() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 금강 2.0 실행 중${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}접속 주소:${NC}"
    echo -e "  🌐 Chat UI:      ${BLUE}http://localhost:3000/chat${NC}"
    echo -e "  📊 Dashboard:    ${BLUE}http://localhost:3000/dashboard${NC}"
    echo -e "  🧠 Memory:       ${BLUE}http://localhost:3000/memory${NC}"
    echo -e "  📚 API Docs:     ${BLUE}http://localhost:8000/docs${NC}"
    echo -e ""
    echo -e "${BOLD}로그 파일:${NC}"
    echo -e "  📝 Backend:      ${CYAN}$BACKEND_LOG${NC}"
    echo -e "  📝 Frontend:     ${CYAN}$FRONTEND_LOG${NC}"
    echo -e ""
    echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 메인 실행
main() {
    # 시그널 핸들러 설정
    trap cleanup INT TERM EXIT

    # 디렉토리 생성
    mkdir -p "$PID_DIR" "$LOG_DIR"

    # 배너 출력
    clear
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}    🧠 금강 2.0 - AI 자기진화 시스템${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e ""

    # 서버 시작
    start_backend
    echo ""
    start_frontend
    echo ""

    # 브라우저 열기
    open_browser

    # 상태 출력
    monitor_status

    # 로그 모니터링 (선택적)
    echo -e "\n${CYAN}실시간 로그를 보시겠습니까? (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo -e "${YELLOW}Backend 로그 (b) / Frontend 로그 (f) / 둘 다 (a)?${NC}"
        read -r log_choice
        case $log_choice in
            b)
                tail -f "$BACKEND_LOG"
                ;;
            f)
                tail -f "$FRONTEND_LOG"
                ;;
            a)
                tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
                ;;
            *)
                # 대기
                while true; do
                    sleep 1
                done
                ;;
        esac
    else
        # 백그라운드에서 계속 실행
        while true; do
            sleep 1
        done
    fi
}

# 스크립트 실행
main
