#!/bin/bash

# 금강 2.0 시작 스크립트
# 백엔드와 프론트엔드를 함께 실행합니다

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 디렉토리
PROJECT_DIR="/home/duksan/바탕화면/gumgang_0_5/gumgang-v2"

echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║        🧠 금강 2.0 시스템 시작          ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 이미 실행 중인 프로세스 확인
check_existing_processes() {
    if lsof -i :8001 >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  포트 8001이 이미 사용 중입니다.${NC}"
        echo -e "${YELLOW}   기존 백엔드를 종료하시겠습니까? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            echo -e "${CYAN}기존 백엔드 종료 중...${NC}"
            pkill -f "test_backend.py"
            pkill -f "uvicorn main:app"
            sleep 2
        else
            echo -e "${RED}시작을 취소합니다.${NC}"
            exit 1
        fi
    fi

    if lsof -i :3000 >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  포트 3000이 이미 사용 중입니다.${NC}"
        echo -e "${YELLOW}   기존 프론트엔드를 종료하시겠습니까? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            echo -e "${CYAN}기존 프론트엔드 종료 중...${NC}"
            pkill -f "next dev"
            sleep 2
        else
            echo -e "${RED}시작을 취소합니다.${NC}"
            exit 1
        fi
    fi
}

# 프로세스 종료 핸들러
cleanup() {
    echo ""
    echo -e "${YELLOW}시스템 종료 중...${NC}"

    # 백엔드 종료
    if [[ -n $BACKEND_PID ]]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${CYAN}✓ 백엔드 종료됨${NC}"
    fi

    # 프론트엔드 종료
    if [[ -n $FRONTEND_PID ]]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${CYAN}✓ 프론트엔드 종료됨${NC}"
    fi

    echo -e "${GREEN}금강 2.0이 안전하게 종료되었습니다.${NC}"
    exit 0
}

# Ctrl+C 시 cleanup 함수 실행
trap cleanup INT TERM

# 기존 프로세스 확인
check_existing_processes

# 디렉토리 이동
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR${NC}"
    exit 1
}

# 1. 백엔드 시작
echo -e "${CYAN}🚀 백엔드 서버 시작 중...${NC}"
python3 test_backend.py > backend.log 2>&1 &
BACKEND_PID=$!

# 백엔드가 시작될 때까지 대기
sleep 3

# 백엔드 상태 확인
if curl -s http://localhost:8001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 백엔드 서버 시작 완료 (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}   URL: http://localhost:8001${NC}"
    echo -e "${BLUE}   API 문서: http://localhost:8001/docs${NC}"
else
    echo -e "${RED}❌ 백엔드 서버 시작 실패${NC}"
    echo -e "${YELLOW}로그 확인: tail -f $PROJECT_DIR/backend.log${NC}"
    exit 1
fi

echo ""

# 2. 프론트엔드 시작
echo -e "${CYAN}🎨 프론트엔드 서버 시작 중...${NC}"

# npm 설치 확인
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm이 설치되어 있지 않습니다.${NC}"
    kill $BACKEND_PID
    exit 1
fi

# node_modules 확인 및 설치
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 의존성 패키지 설치 중...${NC}"
    npm install
fi

# 프론트엔드 시작
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# 프론트엔드가 시작될 때까지 대기
echo -e "${CYAN}프론트엔드 준비 중... (약 10초)${NC}"
sleep 10

# 프론트엔드 상태 확인
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 프론트엔드 서버 시작 완료 (PID: $FRONTEND_PID)${NC}"
    echo -e "${BLUE}   URL: http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  프론트엔드가 아직 준비 중일 수 있습니다.${NC}"
    echo -e "${YELLOW}   로그 확인: tail -f $PROJECT_DIR/frontend.log${NC}"
fi

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║    ✨ 금강 2.0 시스템 실행 중 ✨        ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 브라우저에서 접속: ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo -e "  • 백엔드 로그: tail -f backend.log"
echo -e "  • 프론트엔드 로그: tail -f frontend.log"
echo -e "  • 종료하려면 Ctrl+C를 누르세요"
echo ""
echo -e "${CYAN}시스템이 실행 중입니다. 종료하려면 Ctrl+C를 누르세요...${NC}"

# 프로세스 유지
while true; do
    # 백엔드 상태 확인
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ 백엔드가 예기치 않게 종료되었습니다.${NC}"
        cleanup
    fi

    # 프론트엔드 상태 확인
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}❌ 프론트엔드가 예기치 않게 종료되었습니다.${NC}"
        cleanup
    fi

    sleep 5
done
