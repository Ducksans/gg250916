#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
#  금강 2.0 - 통합 포트 관리자 (Port Manager)
#
#  이 스크립트는 모든 서비스가 지정된 포트에서만 실행되도록 보장합니다.
#  - Backend: 8000
#  - Frontend: 3000
#  - Terminal Server: 8002
# ═══════════════════════════════════════════════════════════════════════════

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 포트 정의 (절대 불변)
readonly BACKEND_PORT=8000
readonly FRONTEND_PORT=3000
readonly TERMINAL_PORT=8002

# 스크립트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 로그 파일
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
PORT_LOG="$LOG_DIR/port_manager.log"

# ═══════════════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════

log() {
    local message="$1"
    local color="${2:-NC}"
    echo -e "${!color}${message}${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$PORT_LOG"
}

header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# 포트 관리 함수
# ═══════════════════════════════════════════════════════════════════════════

# 포트 사용 여부 확인
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1)
        local process_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        log "⚠️  Port $port is in use by PID $pid ($process_info)" "YELLOW"
        return 1
    else
        log "✅ Port $port is available for $service" "GREEN"
        return 0
    fi
}

# 포트 강제 해제
force_free_port() {
    local port=$1
    local service=$2

    log "🔧 Attempting to free port $port for $service..." "YELLOW"

    # 포트를 사용하는 모든 프로세스 찾기
    local pids=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)

    if [ -z "$pids" ]; then
        log "✅ Port $port is already free" "GREEN"
        return 0
    fi

    # 각 PID에 대해 처리
    for pid in $pids; do
        local process_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        log "   Killing process $pid ($process_info) on port $port" "YELLOW"

        # 먼저 정상 종료 시도
        kill $pid 2>/dev/null
        sleep 1

        # 여전히 실행 중이면 강제 종료
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
            log "   Force killed process $pid" "RED"
        else
            log "   Process $pid terminated gracefully" "GREEN"
        fi
    done

    # 포트가 실제로 해제되었는지 확인
    sleep 1
    if check_port $port "$service"; then
        log "✅ Successfully freed port $port" "GREEN"
        return 0
    else
        log "❌ Failed to free port $port" "RED"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# 서비스별 포트 관리
# ═══════════════════════════════════════════════════════════════════════════

manage_backend_port() {
    header "Backend Port Management (Port $BACKEND_PORT)"

    if ! check_port $BACKEND_PORT "Backend"; then
        log "🚨 Backend port $BACKEND_PORT is occupied!" "RED"

        # 현재 백엔드가 실행 중인지 확인
        if pgrep -f "simple_main.py" > /dev/null; then
            log "✅ Backend is already running correctly" "GREEN"
            return 0
        else
            log "⚠️  Port is used by another process, clearing..." "YELLOW"
            force_free_port $BACKEND_PORT "Backend"
        fi
    fi
}

manage_frontend_port() {
    header "Frontend Port Management (Port $FRONTEND_PORT)"

    if ! check_port $FRONTEND_PORT "Frontend"; then
        log "🚨 Frontend port $FRONTEND_PORT is occupied!" "RED"

        # Next.js 프로세스인지 확인
        local pid=$(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
        if [ ! -z "$pid" ]; then
            local cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ')
            if echo "$cmdline" | grep -q "next\|node.*dev"; then
                log "✅ Next.js is already running on port $FRONTEND_PORT" "GREEN"
                return 0
            else
                log "⚠️  Port is used by non-Next.js process, clearing..." "YELLOW"
                force_free_port $FRONTEND_PORT "Frontend"
            fi
        fi
    fi
}

manage_terminal_port() {
    header "Terminal Server Port Management (Port $TERMINAL_PORT)"

    if ! check_port $TERMINAL_PORT "Terminal Server"; then
        log "🚨 Terminal port $TERMINAL_PORT is occupied!" "RED"

        # 터미널 서버가 실행 중인지 확인
        if pgrep -f "terminal_server.py" > /dev/null; then
            log "✅ Terminal server is already running correctly" "GREEN"
            return 0
        else
            log "⚠️  Port is used by another process, clearing..." "YELLOW"
            force_free_port $TERMINAL_PORT "Terminal Server"
        fi
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# 통합 관리 함수
# ═══════════════════════════════════════════════════════════════════════════

check_all_ports() {
    header "🔍 Checking All Service Ports"

    local all_good=true

    # Backend
    if check_port $BACKEND_PORT "Backend"; then
        log "✅ Backend port $BACKEND_PORT: Available" "GREEN"
    else
        log "⚠️  Backend port $BACKEND_PORT: Occupied" "YELLOW"
        all_good=false
    fi

    # Frontend
    if check_port $FRONTEND_PORT "Frontend"; then
        log "✅ Frontend port $FRONTEND_PORT: Available" "GREEN"
    else
        log "⚠️  Frontend port $FRONTEND_PORT: Occupied" "YELLOW"
        all_good=false
    fi

    # Terminal Server
    if check_port $TERMINAL_PORT "Terminal Server"; then
        log "✅ Terminal port $TERMINAL_PORT: Available" "GREEN"
    else
        log "⚠️  Terminal port $TERMINAL_PORT: Occupied" "YELLOW"
        all_good=false
    fi

    echo ""
    if [ "$all_good" = true ]; then
        log "✅ All ports are properly configured!" "GREEN"
    else
        log "⚠️  Some ports need attention" "YELLOW"
    fi
}

force_clear_all() {
    header "🔧 Force Clearing All Service Ports"

    log "⚠️  This will stop all services to ensure clean port allocation" "YELLOW"
    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Cancelled by user" "YELLOW"
        return 1
    fi

    # Stop all services
    log "Stopping all services..." "YELLOW"

    # Backend
    pkill -f "simple_main.py" 2>/dev/null
    pkill -f "uvicorn.*8000" 2>/dev/null

    # Frontend
    pkill -f "next dev" 2>/dev/null
    pkill -f "node.*dev" 2>/dev/null

    # Terminal Server
    pkill -f "terminal_server.py" 2>/dev/null

    sleep 2

    # Force clear ports
    force_free_port $BACKEND_PORT "Backend"
    force_free_port $FRONTEND_PORT "Frontend"
    force_free_port $TERMINAL_PORT "Terminal Server"

    log "✅ All ports have been cleared" "GREEN"
}

monitor_ports() {
    header "📊 Real-time Port Monitoring"

    log "Monitoring ports (Press Ctrl+C to stop)..." "CYAN"

    while true; do
        clear
        header "📊 Port Status - $(date '+%H:%M:%S')"

        # Backend
        echo -ne "${BOLD}Backend ($BACKEND_PORT):${NC} "
        if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}● ACTIVE${NC}"
            local pid=$(lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
            echo "  └─ PID: $pid"
        else
            echo -e "${RED}○ INACTIVE${NC}"
        fi

        # Frontend
        echo -ne "${BOLD}Frontend ($FRONTEND_PORT):${NC} "
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}● ACTIVE${NC}"
            local pid=$(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
            echo "  └─ PID: $pid"
        else
            echo -e "${RED}○ INACTIVE${NC}"
        fi

        # Terminal Server
        echo -ne "${BOLD}Terminal ($TERMINAL_PORT):${NC} "
        if lsof -Pi :$TERMINAL_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}● ACTIVE${NC}"
            local pid=$(lsof -Pi :$TERMINAL_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
            echo "  └─ PID: $pid"
        else
            echo -e "${RED}○ INACTIVE${NC}"
        fi

        echo ""
        echo "Press Ctrl+C to stop monitoring..."
        sleep 2
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# 설정 파일 생성
# ═══════════════════════════════════════════════════════════════════════════

create_port_config() {
    header "📝 Creating Port Configuration File"

    local config_file="$SCRIPT_DIR/.port_config"

    cat > "$config_file" << EOF
# 금강 2.0 Port Configuration
# This file is auto-generated and should not be modified manually
# Generated: $(date)

# Service Ports (DO NOT CHANGE)
BACKEND_PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
TERMINAL_PORT=$TERMINAL_PORT

# Port Lock Status
PORTS_LOCKED=true
ENFORCE_PORTS=true

# Last Check
LAST_CHECK="$(date)"
EOF

    log "✅ Port configuration saved to $config_file" "GREEN"
}

# ═══════════════════════════════════════════════════════════════════════════
# 메인 메뉴
# ═══════════════════════════════════════════════════════════════════════════

show_menu() {
    header "🏔️ 금강 2.0 Port Manager"

    echo ""
    echo -e "${BOLD}Service Ports:${NC}"
    echo -e "  Backend:  ${CYAN}$BACKEND_PORT${NC}"
    echo -e "  Frontend: ${CYAN}$FRONTEND_PORT${NC}"
    echo -e "  Terminal: ${CYAN}$TERMINAL_PORT${NC}"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo "  1) Check all ports"
    echo "  2) Fix backend port"
    echo "  3) Fix frontend port"
    echo "  4) Fix terminal port"
    echo "  5) Force clear ALL ports"
    echo "  6) Monitor ports (real-time)"
    echo "  7) Create port config"
    echo "  8) View logs"
    echo "  0) Exit"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════

main() {
    # 인자가 있으면 직접 실행
    if [ $# -gt 0 ]; then
        case "$1" in
            check)
                check_all_ports
                ;;
            backend)
                manage_backend_port
                ;;
            frontend)
                manage_frontend_port
                ;;
            terminal)
                manage_terminal_port
                ;;
            clear)
                force_clear_all
                ;;
            monitor)
                monitor_ports
                ;;
            config)
                create_port_config
                ;;
            *)
                log "Unknown command: $1" "RED"
                echo "Usage: $0 {check|backend|frontend|terminal|clear|monitor|config}"
                exit 1
                ;;
        esac
    else
        # 인터랙티브 모드
        while true; do
            show_menu
            read -p "Select option: " choice

            case $choice in
                1) check_all_ports ;;
                2) manage_backend_port ;;
                3) manage_frontend_port ;;
                4) manage_terminal_port ;;
                5) force_clear_all ;;
                6) monitor_ports ;;
                7) create_port_config ;;
                8) less "$PORT_LOG" ;;
                0)
                    log "Exiting Port Manager" "CYAN"
                    exit 0
                    ;;
                *)
                    log "Invalid option: $choice" "RED"
                    ;;
            esac

            echo ""
            read -p "Press Enter to continue..."
        done
    fi
}

# 스크립트 시작
main "$@"
