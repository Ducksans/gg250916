#!/bin/bash

# 금강 2.0 통합 시작 스크립트
# 백엔드와 프론트엔드를 함께 실행

echo "================================================"
echo "🚀 금강 2.0 통합 시스템 시작"
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 경로
PROJECT_DIR="/home/duksan/바탕화면/gumgang_0_5"
FRONTEND_DIR="$PROJECT_DIR/gumgang-v2"
VENV_PATH="$PROJECT_DIR/.venv"

# PID 파일
PID_DIR="/tmp/gumgang"
mkdir -p $PID_DIR
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 함수: 프로세스 종료
cleanup() {
    echo ""
    echo -e "${YELLOW}시스템 종료 중...${NC}"

    # 백엔드 종료
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${YELLOW}백엔드 서버 종료 (PID: $BACKEND_PID)${NC}"
            kill $BACKEND_PID
            rm -f "$BACKEND_PID_FILE"
        fi
    fi

    # 프론트엔드 종료
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${YELLOW}프론트엔드 서버 종료 (PID: $FRONTEND_PID)${NC}"
            kill $FRONTEND_PID
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi

    # 추가 정리 (npm 프로세스)
    pkill -f "next dev" 2>/dev/null

    echo -e "${GREEN}✅ 시스템 종료 완료${NC}"
    exit 0
}

# 종료 시그널 처리
trap cleanup SIGINT SIGTERM

# 기존 프로세스 확인 및 종료
echo -e "${BLUE}기존 프로세스 확인 중...${NC}"

# 기존 백엔드 프로세스 확인
if lsof -i:8001 >/dev/null 2>&1; then
    echo -e "${YELLOW}포트 8001에서 실행 중인 프로세스 발견${NC}"
    echo "기존 백엔드 종료 중..."
    pkill -f "backend_unified.py" 2>/dev/null
    pkill -f "test_backend" 2>/dev/null
    sleep 2
fi

# 기존 프론트엔드 프로세스 확인
if lsof -i:3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}포트 3000에서 실행 중인 프로세스 발견${NC}"
    echo "기존 프론트엔드 종료 중..."
    pkill -f "next dev" 2>/dev/null
    sleep 2
fi

# Python 가상환경 확인
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}❌ Python 가상환경을 찾을 수 없습니다: $VENV_PATH${NC}"
    echo "가상환경을 먼저 생성해주세요:"
    echo "  python3 -m venv $VENV_PATH"
    exit 1
fi

# 필요한 Python 패키지 확인 및 설치
echo -e "${BLUE}Python 패키지 확인 중...${NC}"
source "$VENV_PATH/bin/activate"

# 필요한 패키지 목록
REQUIRED_PACKAGES="fastapi uvicorn websockets python-dotenv pydantic"

for package in $REQUIRED_PACKAGES; do
    if ! pip show $package >/dev/null 2>&1; then
        echo -e "${YELLOW}$package 설치 중...${NC}"
        pip install $package
    fi
done

# 백엔드 서버 시작
echo ""
echo -e "${GREEN}🔧 백엔드 서버 시작 중...${NC}"
cd "$FRONTEND_DIR"

if [ -f "backend_unified.py" ]; then
    # 백엔드 로그 파일
    BACKEND_LOG="$FRONTEND_DIR/unified_backend.log"

    # 백엔드 실행
    nohup "$VENV_PATH/bin/python3" backend_unified.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"

    echo -e "${GREEN}✅ 백엔드 서버 시작 (PID: $BACKEND_PID)${NC}"
    echo "   URL: http://localhost:8001"
    echo "   WebSocket: ws://localhost:8001/ws"
    echo "   로그: $BACKEND_LOG"
else
    echo -e "${RED}❌ backend_unified.py 파일을 찾을 수 없습니다${NC}"
    exit 1
fi

# 백엔드 시작 대기
echo -e "${BLUE}백엔드 초기화 대기 중...${NC}"
sleep 3

# 백엔드 상태 확인
if ! curl -s http://localhost:8001/health >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  백엔드 헬스체크 실패 (계속 진행)${NC}"
else
    echo -e "${GREEN}✅ 백엔드 헬스체크 성공${NC}"
fi

# 프론트엔드 서버 시작
echo ""
echo -e "${GREEN}🎨 프론트엔드 서버 시작 중...${NC}"

# Node modules 확인
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}node_modules가 없습니다. 패키지 설치 중...${NC}"
    cd "$FRONTEND_DIR"
    npm install
fi

# 프론트엔드 실행
cd "$FRONTEND_DIR"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"

echo -e "${GREEN}✅ 프론트엔드 서버 시작 (PID: $FRONTEND_PID)${NC}"
echo "   URL: http://localhost:3000"

# 시작 완료 메시지
echo ""
echo "================================================"
echo -e "${GREEN}🎉 금강 2.0 시스템 시작 완료!${NC}"
echo "================================================"
echo ""
echo "📌 접속 정보:"
echo "   - 대시보드: http://localhost:3000/dashboard"
echo "   - API 문서: http://localhost:8001/docs"
echo "   - WebSocket: ws://localhost:8001/ws"
echo ""
echo "📌 모니터링:"
echo "   - 백엔드 로그: tail -f $FRONTEND_DIR/unified_backend.log"
echo "   - 프론트엔드 로그: 이 터미널에 표시됩니다"
echo ""
echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
echo ""

# 브라우저 자동 열기 (옵션)
if command -v xdg-open >/dev/null 2>&1; then
    sleep 5
    echo -e "${BLUE}브라우저에서 대시보드 열기...${NC}"
    xdg-open "http://localhost:3000/dashboard" 2>/dev/null &
fi

# 프론트엔드 로그 표시
echo ""
echo "================================================"
echo "프론트엔드 로그:"
echo "================================================"
tail -f /dev/null --pid=$FRONTEND_PID 2>/dev/null &

# 프로세스 모니터링
while true; do
    # 백엔드 프로세스 확인
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${RED}❌ 백엔드 서버가 종료되었습니다${NC}"
            cleanup
        fi
    fi

    # 프론트엔드 프로세스 확인
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${RED}❌ 프론트엔드 서버가 종료되었습니다${NC}"
            cleanup
        fi
    fi

    sleep 5
done
