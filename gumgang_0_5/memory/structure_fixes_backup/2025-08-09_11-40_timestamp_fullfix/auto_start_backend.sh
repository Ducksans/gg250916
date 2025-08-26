#!/bin/bash

# 🚀 Gumgang 2.0 Backend 자동 시작 스크립트
# 목적: 새 세션 진입시 백엔드 자동 확인 및 시작
# 시간 절약: 세션당 2-3분 → 0초

# 색상 코드 (선택적 출력용)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 경로 설정
BACKEND_DIR="/home/duksan/바탕화면/gumgang_0_5/backend"
PID_FILE="$BACKEND_DIR/backend.pid"
LOG_FILE="$BACKEND_DIR/logs/backend.log"
ERROR_LOG="$BACKEND_DIR/logs/backend_error.log"
PORT=8000

# 조용한 모드 (기본값: true, .bashrc에서 호출시 출력 최소화)
QUIET_MODE=${1:-true}

log_message() {
    if [ "$QUIET_MODE" != "true" ]; then
        echo -e "$1"
    fi
}

# 백엔드 상태 확인 함수
check_backend_status() {
    # 1. 헬스체크 API 확인 (가장 확실한 방법)
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null | grep -q "200"; then
        return 0  # 실행 중
    fi

    # 2. PID 파일 확인
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            # 프로세스는 있지만 API 응답이 없는 경우
            sleep 2
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null | grep -q "200"; then
                return 0
            fi
        fi
        # PID 파일은 있지만 프로세스가 없으면 삭제
        rm -f "$PID_FILE"
    fi

    return 1  # 실행 중이 아님
}

# 백엔드 시작 함수
start_backend() {
    log_message "${BLUE}🚀 Gumgang 백엔드 시작 중...${NC}"

    # 로그 디렉토리 생성
    mkdir -p "$BACKEND_DIR/logs"

    # 이전 로그 백업 (선택적)
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d_%H%M%S).bak" 2>/dev/null || true
    fi

    # 디렉토리 이동
    cd "$BACKEND_DIR" || {
        log_message "${RED}❌ 백엔드 디렉토리를 찾을 수 없습니다: $BACKEND_DIR${NC}"
        return 1
    }

    # Python 실행 파일 확인
    if [ ! -f "simple_main.py" ]; then
        log_message "${RED}❌ simple_main.py 파일을 찾을 수 없습니다${NC}"
        return 1
    fi

    # 백엔드 시작 (nohup 사용)
    nohup python3 simple_main.py > "$LOG_FILE" 2> "$ERROR_LOG" &
    local PID=$!
    echo $PID > "$PID_FILE"

    # 시작 대기 (최대 10초)
    local count=0
    while [ $count -lt 10 ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null | grep -q "200"; then
            log_message "${GREEN}✅ 백엔드가 성공적으로 시작되었습니다 (PID: $PID)${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    # 시작 실패
    log_message "${RED}❌ 백엔드 시작 실패. 로그를 확인하세요: $ERROR_LOG${NC}"
    if [ -f "$ERROR_LOG" ]; then
        tail -5 "$ERROR_LOG" 2>/dev/null
    fi
    return 1
}

# 백엔드 중지 함수
stop_backend() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log_message "${YELLOW}🛑 백엔드 중지 중... (PID: $PID)${NC}"
            kill -TERM $PID 2>/dev/null || true
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -KILL $PID 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # 포트를 사용 중인 다른 프로세스 확인
    local PORT_PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        log_message "${YELLOW}포트 $PORT를 사용 중인 프로세스 종료 중...${NC}"
        kill -TERM $PORT_PID 2>/dev/null || true
    fi
}

# 백엔드 재시작 함수
restart_backend() {
    stop_backend
    sleep 2
    start_backend
}

# 상태 출력 함수
show_status() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Gumgang Backend 상태 정보          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

    if check_backend_status; then
        echo -e "${GREEN}● 상태: 실행 중${NC}"
        if [ -f "$PID_FILE" ]; then
            echo -e "  PID: $(cat $PID_FILE)"
        fi
        echo -e "  URL: http://localhost:$PORT"

        # API 테스트
        echo -e "\n${BLUE}API 헬스체크:${NC}"
        curl -s http://localhost:$PORT/health | python3 -m json.tool 2>/dev/null || echo "  JSON 파싱 실패"
    else
        echo -e "${RED}● 상태: 중지됨${NC}"
        echo -e "${YELLOW}  시작하려면: $0 start${NC}"
    fi

    # 로그 파일 정보
    echo -e "\n${BLUE}로그 파일:${NC}"
    if [ -f "$LOG_FILE" ]; then
        echo -e "  메인: $LOG_FILE ($(wc -l < $LOG_FILE) lines)"
    fi
    if [ -f "$ERROR_LOG" ]; then
        echo -e "  에러: $ERROR_LOG ($(wc -l < $ERROR_LOG) lines)"
    fi
}

# 메인 로직
main() {
    case "${1:-auto}" in
        start)
            QUIET_MODE=false
            if check_backend_status; then
                echo -e "${YELLOW}백엔드가 이미 실행 중입니다${NC}"
            else
                start_backend
            fi
            ;;
        stop)
            QUIET_MODE=false
            stop_backend
            ;;
        restart)
            QUIET_MODE=false
            restart_backend
            ;;
        status)
            QUIET_MODE=false
            show_status
            ;;
        auto)
            # 자동 모드: 조용히 확인하고 필요시 시작
            if ! check_backend_status; then
                QUIET_MODE=${QUIET_MODE:-true}
                start_backend
            fi
            ;;
        check)
            # 체크만 (반환값으로 상태 전달)
            check_backend_status
            exit $?
            ;;
        logs)
            # 로그 보기
            if [ -f "$LOG_FILE" ]; then
                tail -f "$LOG_FILE"
            else
                echo "로그 파일이 없습니다"
            fi
            ;;
        errors)
            # 에러 로그 보기
            if [ -f "$ERROR_LOG" ]; then
                tail -f "$ERROR_LOG"
            else
                echo "에러 로그 파일이 없습니다"
            fi
            ;;
        *)
            echo "사용법: $0 {start|stop|restart|status|auto|check|logs|errors}"
            echo ""
            echo "Commands:"
            echo "  start   - 백엔드 시작"
            echo "  stop    - 백엔드 중지"
            echo "  restart - 백엔드 재시작"
            echo "  status  - 상태 확인"
            echo "  auto    - 자동 확인 및 시작 (조용한 모드)"
            echo "  check   - 실행 여부만 확인"
            echo "  logs    - 실시간 로그 보기"
            echo "  errors  - 에러 로그 보기"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
