#!/bin/bash

# 금강 2.0 테스트 서버 실행 스크립트
# 작성일: 2025-01-08
# Task: 백엔드 & 프론트엔드 동시 실행

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           금강 2.0 테스트 서버 시작                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# 프로젝트 루트 디렉토리
PROJECT_ROOT="/home/duksan/바탕화면/gumgang_0_5"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 프로젝트 디렉토리 확인
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_ROOT${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"
echo -e "${GREEN}✅ 프로젝트 디렉토리: $PROJECT_ROOT${NC}"

# 2. 가상환경 활성화
echo -e "\n${YELLOW}🔧 가상환경 활성화 중...${NC}"
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ venv 가상환경 활성화됨${NC}"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    echo -e "${GREEN}✅ .venv 가상환경 활성화됨${NC}"
else
    echo -e "${YELLOW}⚠️  가상환경이 없습니다. 시스템 Python을 사용합니다.${NC}"
fi

# 3. Python 패키지 확인
echo -e "\n${YELLOW}📦 필수 패키지 확인 중...${NC}"
python3 -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}FastAPI 설치 중...${NC}"
    pip install fastapi uvicorn python-multipart websockets
fi

# 4. Node.js 패키지 확인
echo -e "\n${YELLOW}📦 Node.js 패키지 확인 중...${NC}"
cd "$PROJECT_ROOT/gumgang-v2"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}npm 패키지 설치 중... (시간이 걸릴 수 있습니다)${NC}"
    npm install
fi

# 5. 실행 중인 서버 확인 및 종료
echo -e "\n${YELLOW}🔍 기존 서버 확인 중...${NC}"

# 8000 포트 확인
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}포트 8000이 사용 중입니다. 종료합니다...${NC}"
    kill $(lsof -Pi :8000 -sTCP:LISTEN -t)
    sleep 2
fi

# 3000 포트 확인
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}포트 3000이 사용 중입니다. 종료합니다...${NC}"
    kill $(lsof -Pi :3000 -sTCP:LISTEN -t)
    sleep 2
fi

# 6. tmux 세션 확인
if command -v tmux &> /dev/null; then
    echo -e "\n${GREEN}✅ tmux를 사용하여 서버를 실행합니다.${NC}"

    # 기존 세션 종료
    tmux kill-session -t gumgang 2>/dev/null

    # 새 tmux 세션 생성
    tmux new-session -d -s gumgang -n backend

    # 백엔드 실행
    tmux send-keys -t gumgang:backend "cd $PROJECT_ROOT" C-m
    if [ -d "venv" ]; then
        tmux send-keys -t gumgang:backend "source venv/bin/activate" C-m
    elif [ -d ".venv" ]; then
        tmux send-keys -t gumgang:backend "source .venv/bin/activate" C-m
    fi
    tmux send-keys -t gumgang:backend "cd backend" C-m
    tmux send-keys -t gumgang:backend "python main.py" C-m

    # 프론트엔드 윈도우 생성
    tmux new-window -t gumgang -n frontend
    tmux send-keys -t gumgang:frontend "cd $PROJECT_ROOT/gumgang-v2" C-m
    tmux send-keys -t gumgang:frontend "npm run dev" C-m

    # 로그 윈도우 생성
    tmux new-window -t gumgang -n logs
    tmux send-keys -t gumgang:logs "cd $PROJECT_ROOT" C-m
    tmux send-keys -t gumgang:logs "tail -f backend/backend.log" C-m

    echo -e "${GREEN}✨ 서버가 시작되었습니다!${NC}"
    echo ""
    echo -e "${BLUE}📌 접속 정보:${NC}"
    echo -e "  백엔드: ${GREEN}http://localhost:8000${NC}"
    echo -e "  프론트엔드: ${GREEN}http://localhost:3000${NC}"
    echo -e "  API 문서: ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}📌 tmux 명령어:${NC}"
    echo -e "  세션 연결: ${YELLOW}tmux attach -t gumgang${NC}"
    echo -e "  윈도우 전환: ${YELLOW}Ctrl+b 후 숫자 (0: backend, 1: frontend, 2: logs)${NC}"
    echo -e "  세션 종료: ${YELLOW}tmux kill-session -t gumgang${NC}"

else
    # tmux가 없는 경우 백그라운드 실행
    echo -e "\n${YELLOW}⚠️  tmux가 설치되지 않았습니다. 백그라운드로 실행합니다.${NC}"

    # 백엔드 실행
    echo -e "\n${YELLOW}🔧 백엔드 서버 시작 중...${NC}"
    cd "$PROJECT_ROOT/backend"
    nohup python main.py > "$PROJECT_ROOT/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ 백엔드 서버 시작 (PID: $BACKEND_PID)${NC}"

    # 프론트엔드 실행
    echo -e "\n${YELLOW}🎨 프론트엔드 서버 시작 중...${NC}"
    cd "$PROJECT_ROOT/gumgang-v2"
    nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ 프론트엔드 서버 시작 (PID: $FRONTEND_PID)${NC}"

    # PID 저장
    echo "$BACKEND_PID" > "$PROJECT_ROOT/.backend.pid"
    echo "$FRONTEND_PID" > "$PROJECT_ROOT/.frontend.pid"

    echo -e "\n${GREEN}✨ 서버가 시작되었습니다!${NC}"
    echo ""
    echo -e "${BLUE}📌 접속 정보:${NC}"
    echo -e "  백엔드: ${GREEN}http://localhost:8000${NC}"
    echo -e "  프론트엔드: ${GREEN}http://localhost:3000${NC}"
    echo -e "  API 문서: ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}📌 로그 확인:${NC}"
    echo -e "  백엔드: ${YELLOW}tail -f $PROJECT_ROOT/backend.log${NC}"
    echo -e "  프론트엔드: ${YELLOW}tail -f $PROJECT_ROOT/frontend.log${NC}"
    echo ""
    echo -e "${BLUE}📌 서버 종료:${NC}"
    echo -e "  ${YELLOW}$PROJECT_ROOT/stop_gumgang_test.sh${NC}"
fi

# 7. 서버 상태 확인 (5초 대기)
echo -e "\n${YELLOW}⏳ 서버 시작 확인 중... (5초 대기)${NC}"
sleep 5

# 백엔드 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null | grep -q "200\|404"; then
    echo -e "${GREEN}✅ 백엔드 서버 정상 작동 중${NC}"
else
    echo -e "${RED}❌ 백엔드 서버 응답 없음${NC}"
    echo -e "${YELLOW}   backend.log를 확인하세요${NC}"
fi

# 프론트엔드 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ 프론트엔드 서버 정상 작동 중${NC}"
else
    echo -e "${YELLOW}⏳ 프론트엔드 서버 시작 중... (Next.js 빌드에 시간이 걸립니다)${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           금강 2.0 테스트 서버 준비 완료!                    ║"
echo "║                                                              ║"
echo "║   브라우저에서 http://localhost:3000 접속하세요             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
