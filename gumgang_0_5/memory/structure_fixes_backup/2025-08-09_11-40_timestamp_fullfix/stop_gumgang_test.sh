#!/bin/bash

# 금강 2.0 테스트 서버 종료 스크립트
# 작성일: 2025-01-08
# Task: 백엔드 & 프론트엔드 서버 종료

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           금강 2.0 테스트 서버 종료                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# 프로젝트 루트 디렉토리
PROJECT_ROOT="/home/duksan/바탕화면/gumgang_0_5"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd "$PROJECT_ROOT"

echo -e "\n${YELLOW}🔍 실행 중인 서버 확인 중...${NC}"

# 1. tmux 세션 확인 및 종료
if command -v tmux &> /dev/null; then
    if tmux has-session -t gumgang 2>/dev/null; then
        echo -e "${YELLOW}tmux 세션 'gumgang' 종료 중...${NC}"
        tmux kill-session -t gumgang
        echo -e "${GREEN}✅ tmux 세션 종료됨${NC}"
    else
        echo -e "${BLUE}ℹ️  tmux 세션이 실행 중이지 않습니다.${NC}"
    fi
fi

# 2. PID 파일로 프로세스 종료
if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}백엔드 서버 (PID: $BACKEND_PID) 종료 중...${NC}"
        kill $BACKEND_PID
        echo -e "${GREEN}✅ 백엔드 서버 종료됨${NC}"
    fi
    rm "$PROJECT_ROOT/.backend.pid"
fi

if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/.frontend.pid")
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}프론트엔드 서버 (PID: $FRONTEND_PID) 종료 중...${NC}"
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ 프론트엔드 서버 종료됨${NC}"
    fi
    rm "$PROJECT_ROOT/.frontend.pid"
fi

# 3. 포트 기반 프로세스 종료 (백업 방법)
echo -e "\n${YELLOW}🔍 포트 확인 중...${NC}"

# 8000 포트 (백엔드)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}포트 8000에서 실행 중인 프로세스 종료 중...${NC}"
    kill $(lsof -Pi :8000 -sTCP:LISTEN -t) 2>/dev/null
    echo -e "${GREEN}✅ 포트 8000 프로세스 종료됨${NC}"
else
    echo -e "${BLUE}ℹ️  포트 8000이 사용 중이지 않습니다.${NC}"
fi

# 3000 포트 (프론트엔드)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}포트 3000에서 실행 중인 프로세스 종료 중...${NC}"
    kill $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null
    echo -e "${GREEN}✅ 포트 3000 프로세스 종료됨${NC}"
else
    echo -e "${BLUE}ℹ️  포트 3000이 사용 중이지 않습니다.${NC}"
fi

# 4. Python 및 Node 프로세스 확인
echo -e "\n${YELLOW}🔍 관련 프로세스 확인 중...${NC}"

# main.py 프로세스 찾기
MAIN_PY_PIDS=$(ps aux | grep "[p]ython.*main.py" | awk '{print $2}')
if [ ! -z "$MAIN_PY_PIDS" ]; then
    echo -e "${YELLOW}main.py 프로세스 종료 중...${NC}"
    echo "$MAIN_PY_PIDS" | xargs kill 2>/dev/null
    echo -e "${GREEN}✅ main.py 프로세스 종료됨${NC}"
fi

# app_new.py 프로세스 찾기
APP_NEW_PIDS=$(ps aux | grep "[p]ython.*app_new.py" | awk '{print $2}')
if [ ! -z "$APP_NEW_PIDS" ]; then
    echo -e "${YELLOW}app_new.py 프로세스 종료 중...${NC}"
    echo "$APP_NEW_PIDS" | xargs kill 2>/dev/null
    echo -e "${GREEN}✅ app_new.py 프로세스 종료됨${NC}"
fi

# npm/node 프로세스 찾기 (gumgang-v2 관련)
NODE_PIDS=$(ps aux | grep "[n]ode.*gumgang-v2" | awk '{print $2}')
if [ ! -z "$NODE_PIDS" ]; then
    echo -e "${YELLOW}Node.js 프로세스 종료 중...${NC}"
    echo "$NODE_PIDS" | xargs kill 2>/dev/null
    echo -e "${GREEN}✅ Node.js 프로세스 종료됨${NC}"
fi

# 5. 최종 확인
echo -e "\n${BLUE}📊 최종 상태 확인:${NC}"
sleep 2

# 포트 상태 확인
PORT_8000_STATUS="✅ 비활성"
PORT_3000_STATUS="✅ 비활성"

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_8000_STATUS="❌ 여전히 사용 중"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_3000_STATUS="❌ 여전히 사용 중"
fi

echo -e "  포트 8000 (백엔드): ${PORT_8000_STATUS}"
echo -e "  포트 3000 (프론트엔드): ${PORT_3000_STATUS}"

# 6. 로그 파일 정리 옵션
echo -e "\n${YELLOW}로그 파일을 삭제하시겠습니까? (y/N)${NC}"
read -t 5 -n 1 CLEAN_LOGS
echo ""

if [[ $CLEAN_LOGS =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}로그 파일 정리 중...${NC}"
    rm -f "$PROJECT_ROOT/backend.log" 2>/dev/null
    rm -f "$PROJECT_ROOT/frontend.log" 2>/dev/null
    rm -f "$PROJECT_ROOT/backend/backend.log" 2>/dev/null
    rm -f "$PROJECT_ROOT/gumgang-v2/dev.log" 2>/dev/null
    echo -e "${GREEN}✅ 로그 파일 정리 완료${NC}"
else
    echo -e "${BLUE}ℹ️  로그 파일을 유지합니다.${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           금강 2.0 테스트 서버 종료 완료!                    ║"
echo "║                                                              ║"
echo "║   다시 시작하려면: ./start_gumgang_test.sh                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
