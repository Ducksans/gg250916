#!/bin/bash

# 금강 2.0 테스트 백엔드 서버 시작 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}   🧠 금강 2.0 테스트 서버 시작${NC}"
echo -e "${PURPLE}========================================${NC}"

# Python 가상환경 확인 및 활성화
if [ -d "venv" ]; then
    echo -e "${BLUE}✓ Python 가상환경 발견${NC}"
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo -e "${BLUE}✓ Python 가상환경 발견 (.venv)${NC}"
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

# 로그 디렉토리 생성
mkdir -p logs

# 기존 서버 프로세스 확인
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠ 포트 8001이 이미 사용 중입니다${NC}"
    echo -e "${YELLOW}→ 기존 서버를 종료하시겠습니까? (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" ]]; then
        kill $(lsof -Pi :8001 -sTCP:LISTEN -t)
        sleep 2
        echo -e "${GREEN}✓ 기존 서버 종료 완료${NC}"
    else
        echo -e "${RED}✗ 서버 시작 취소${NC}"
        exit 1
    fi
fi

# 환경 변수 설정
export PYTHONUNBUFFERED=1
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# 서버 시작
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 서버 시작 중...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📡 서버 주소: ${BLUE}http://localhost:8001${NC}"
echo -e "📚 API 문서: ${BLUE}http://localhost:8001/docs${NC}"
echo -e "🔄 자동 리로드: ${GREEN}활성화${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
echo ""

# 서버 실행 (로그는 화면과 파일에 동시 출력)
python test_server.py 2>&1 | tee -a logs/test_server_$(date +%Y%m%d_%H%M%S).log
