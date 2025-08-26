#!/bin/bash

# 금강 2.0 백엔드 자동 실행 스크립트
# 작성일: 2025-01-08

echo "🚀 금강 2.0 백엔드 서버를 시작합니다..."
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 백엔드 디렉토리 경로
BACKEND_DIR="/home/duksan/바탕화면/gumgang_0_5/backend"
VENV_DIR="$BACKEND_DIR/venv"
LOG_FILE="$BACKEND_DIR/backend.log"

# 백엔드 디렉토리 확인
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ 오류: 백엔드 디렉토리를 찾을 수 없습니다.${NC}"
    echo "   경로: $BACKEND_DIR"
    exit 1
fi

# 백엔드 디렉토리로 이동
cd "$BACKEND_DIR" || exit 1
echo -e "${BLUE}📁 작업 디렉토리: $(pwd)${NC}"

# 가상환경 확인
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}⚠️  가상환경이 없습니다. 생성을 시작합니다...${NC}"
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 가상환경 생성 완료${NC}"
    else
        echo -e "${RED}❌ 가상환경 생성 실패${NC}"
        exit 1
    fi
fi

# 가상환경 활성화
echo -e "${BLUE}🔧 가상환경 활성화 중...${NC}"
source "$VENV_DIR/bin/activate"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 가상환경 활성화 완료${NC}"
else
    echo -e "${RED}❌ 가상환경 활성화 실패${NC}"
    exit 1
fi

# Python 버전 확인
PYTHON_VERSION=$(python --version 2>&1)
echo -e "${BLUE}🐍 $PYTHON_VERSION${NC}"

# 필수 패키지 확인 및 설치
echo -e "${BLUE}📦 필수 패키지 확인 중...${NC}"

# uvicorn 설치 확인
if ! python -c "import uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  uvicorn이 설치되지 않았습니다. 설치를 시작합니다...${NC}"
    pip install uvicorn
fi

# fastapi 설치 확인
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  FastAPI가 설치되지 않았습니다. 설치를 시작합니다...${NC}"
    pip install fastapi
fi

# 기타 필수 패키지 확인
REQUIRED_PACKAGES=("pydantic" "python-multipart" "python-dotenv" "openai" "chromadb" "langchain" "sqlalchemy")

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! python -c "import $package" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  $package 설치 중...${NC}"
        pip install "$package"
    fi
done

echo -e "${GREEN}✅ 모든 필수 패키지 확인 완료${NC}"

# 포트 8001이 이미 사용 중인지 확인
PORT=8001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  포트 $PORT이 이미 사용 중입니다.${NC}"
    echo -e "${YELLOW}   기존 프로세스를 종료하시겠습니까? (y/n)${NC}"
    read -r answer
    if [ "$answer" = "y" ]; then
        echo -e "${BLUE}🔧 포트 $PORT의 프로세스를 종료합니다...${NC}"
        kill -9 $(lsof -t -i:$PORT)
        sleep 2
    else
        echo -e "${RED}❌ 서버 시작을 취소합니다.${NC}"
        exit 1
    fi
fi

# 환경 변수 파일 확인
if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ .env 파일 발견${NC}"
    # OpenAI API 키 확인
    if grep -q "OPENAI_API_KEY" "$BACKEND_DIR/.env"; then
        echo -e "${GREEN}✅ OpenAI API 키 설정됨${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAI API 키가 설정되지 않았습니다.${NC}"
        echo "   일부 기능이 제한될 수 있습니다."
    fi
else
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다.${NC}"
    echo "   기본 설정으로 실행됩니다."
fi

# 서버 시작
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}     🧠 금강 2.0 백엔드 서버 시작 🧠${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📡 서버 주소: http://localhost:$PORT${NC}"
echo -e "${GREEN}📚 API 문서: http://localhost:$PORT/docs${NC}"
echo -e "${GREEN}🔄 자동 리로드: 활성화${NC}"
echo ""
echo -e "${YELLOW}💡 팁: Ctrl+C로 서버를 종료할 수 있습니다.${NC}"
echo ""
echo -e "${BLUE}🚀 서버 시작 중...${NC}"
echo "================================================"
echo ""

# 로그 파일 생성
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 금강 2.0 백엔드 서버 시작" >> "$LOG_FILE"

# Uvicorn 서버 실행
if [ -f "$BACKEND_DIR/main.py" ]; then
    # 실시간 로그 출력과 파일 저장을 동시에
    exec uvicorn main:app \
        --host 0.0.0.0 \
        --port $PORT \
        --reload \
        --reload-dir "$BACKEND_DIR" \
        --log-level info \
        2>&1 | tee -a "$LOG_FILE"
else
    echo -e "${RED}❌ main.py 파일을 찾을 수 없습니다.${NC}"
    echo "   경로: $BACKEND_DIR/main.py"
    exit 1
fi

# 서버가 비정상 종료된 경우
echo ""
echo -e "${RED}⚠️  서버가 종료되었습니다.${NC}"
echo -e "${YELLOW}로그 파일: $LOG_FILE${NC}"
echo ""

# 가상환경 비활성화
deactivate 2>/dev/null

exit 0
