#!/bin/bash

# 금강 2.0 백엔드 자동 시작 스크립트
# Task: GG-20250108-005 - 백엔드 안정화
# 작성일: 2025-08-08

set -e  # 에러 발생 시 스크립트 중단

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SCRIPT_DIR"
VENV_PATH="$BACKEND_DIR/venv"
LOG_DIR="$BACKEND_DIR/logs"
PID_FILE="$BACKEND_DIR/backend.pid"
PORT=8001

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 현재 시간 포맷
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(timestamp) - $1"
    echo "[INFO] $(timestamp) - $1" >> "$LOG_DIR/backend_start.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(timestamp) - $1"
    echo "[ERROR] $(timestamp) - $1" >> "$LOG_DIR/backend_start.log"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $(timestamp) - $1"
    echo "[WARN] $(timestamp) - $1" >> "$LOG_DIR/backend_start.log"
}

# 포트 사용 확인
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 포트 사용 중
    else
        return 1  # 포트 사용 가능
    fi
}

# 기존 프로세스 종료
stop_backend() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log_info "기존 백엔드 프로세스 종료 중... (PID: $PID)"
            kill -TERM $PID 2>/dev/null || true
            sleep 2

            # 강제 종료 필요 시
            if ps -p $PID > /dev/null 2>&1; then
                log_warning "강제 종료 시도..."
                kill -KILL $PID 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # 포트 점유 프로세스 확인 및 종료
    if check_port; then
        log_warning "포트 $PORT 를 사용 중인 프로세스 발견"
        PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
        log_info "프로세스 종료 시도... (PID: $PID)"
        kill -TERM $PID 2>/dev/null || true
        sleep 2
    fi
}

# 가상환경 확인 및 활성화
activate_venv() {
    if [ ! -d "$VENV_PATH" ]; then
        log_error "가상환경을 찾을 수 없습니다: $VENV_PATH"
        log_info "가상환경을 생성하시겠습니까? (y/n)"
        read -r response
        if [ "$response" = "y" ]; then
            log_info "가상환경 생성 중..."
            python3 -m venv "$VENV_PATH"
            source "$VENV_PATH/bin/activate"
            log_info "필수 패키지 설치 중..."
            pip install -r "$BACKEND_DIR/requirements.txt"
        else
            exit 1
        fi
    else
        source "$VENV_PATH/bin/activate"
        log_info "가상환경 활성화 완료"
    fi
}

# 백엔드 헬스체크
health_check() {
    local max_attempts=10
    local attempt=0

    log_info "백엔드 헬스체크 시작..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health | grep -q "200"; then
            log_info "✅ 백엔드 정상 작동 확인!"
            return 0
        fi

        attempt=$((attempt + 1))
        log_info "헬스체크 시도 $attempt/$max_attempts..."
        sleep 2
    done

    log_error "백엔드 헬스체크 실패"
    return 1
}

# 백엔드 시작
start_backend() {
    log_info "금강 2.0 백엔드 시작 중..."
    log_info "프로젝트 루트: $PROJECT_ROOT"
    log_info "백엔드 디렉토리: $BACKEND_DIR"

    # 디렉토리 이동
    cd "$BACKEND_DIR"

    # 가상환경 활성화
    activate_venv

    # 백엔드 서버 선택
    if [ -f "$BACKEND_DIR/simple_main.py" ]; then
        MAIN_FILE="simple_main.py"
        log_info "테스트 서버 모드 (simple_main.py)"
    else
        MAIN_FILE="main.py"
        log_info "프로덕션 서버 모드 (main.py)"
    fi

    # 백엔드 시작
    log_info "서버 시작: $MAIN_FILE (포트: $PORT)"

    # nohup으로 백그라운드 실행
    nohup python3 "$MAIN_FILE" \
        > "$LOG_DIR/backend_output.log" \
        2> "$LOG_DIR/backend_error.log" &

    # PID 저장
    echo $! > "$PID_FILE"
    PID=$(cat "$PID_FILE")

    log_info "백엔드 프로세스 시작됨 (PID: $PID)"

    # 서버 시작 대기
    sleep 3

    # 프로세스 확인
    if ps -p $PID > /dev/null; then
        log_info "프로세스 실행 확인"

        # 헬스체크
        if health_check; then
            log_info "🚀 백엔드 서버 정상 시작!"
            log_info "URL: http://localhost:$PORT"
            log_info "로그: $LOG_DIR/backend_output.log"
            return 0
        else
            log_error "헬스체크 실패 - 로그 확인 필요"
            tail -20 "$LOG_DIR/backend_error.log"
            return 1
        fi
    else
        log_error "프로세스 시작 실패"
        tail -20 "$LOG_DIR/backend_error.log"
        return 1
    fi
}

# 상태 확인
check_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            log_info "백엔드 실행 중 (PID: $PID)"

            # API 상태 확인
            if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ API 응답 정상${NC}"

                # 상세 정보
                echo -e "\n${BLUE}=== 백엔드 상태 ===${NC}"
                curl -s http://localhost:$PORT/health | python3 -m json.tool 2>/dev/null || echo "JSON 파싱 실패"
            else
                echo -e "${YELLOW}⚠️  API 응답 없음${NC}"
            fi
        else
            log_warning "PID 파일은 있지만 프로세스가 없습니다"
            rm -f "$PID_FILE"
        fi
    else
        log_info "백엔드가 실행되지 않았습니다"
    fi

    # 포트 상태
    if check_port; then
        echo -e "${BLUE}포트 $PORT 사용 중${NC}"
    else
        echo -e "${YELLOW}포트 $PORT 사용 가능${NC}"
    fi
}

# 로그 보기
show_logs() {
    log_info "최근 로그 표시..."
    echo -e "\n${BLUE}=== 출력 로그 (최근 20줄) ===${NC}"
    tail -20 "$LOG_DIR/backend_output.log" 2>/dev/null || echo "로그 없음"

    echo -e "\n${BLUE}=== 에러 로그 (최근 20줄) ===${NC}"
    tail -20 "$LOG_DIR/backend_error.log" 2>/dev/null || echo "에러 없음"
}

# 메인 로직
main() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     금강 2.0 백엔드 관리 스크립트     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

    case "${1:-}" in
        start)
            stop_backend
            start_backend
            ;;
        stop)
            stop_backend
            log_info "백엔드 종료 완료"
            ;;
        restart)
            stop_backend
            sleep 2
            start_backend
            ;;
        status)
            check_status
            ;;
        logs)
            show_logs
            ;;
        health)
            if health_check; then
                echo -e "${GREEN}✅ 헬스체크 성공${NC}"
            else
                echo -e "${RED}❌ 헬스체크 실패${NC}"
                exit 1
            fi
            ;;
        *)
            echo "사용법: $0 {start|stop|restart|status|logs|health}"
            echo ""
            echo "Commands:"
            echo "  start   - 백엔드 서버 시작"
            echo "  stop    - 백엔드 서버 종료"
            echo "  restart - 백엔드 서버 재시작"
            echo "  status  - 현재 상태 확인"
            echo "  logs    - 최근 로그 확인"
            echo "  health  - 헬스체크 실행"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
