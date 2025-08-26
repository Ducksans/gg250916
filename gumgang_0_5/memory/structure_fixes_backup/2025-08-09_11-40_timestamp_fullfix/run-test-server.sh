#!/bin/bash

# 금강 2.0 테스트 서버 실행 스크립트
# 백엔드 의존성 문제를 우회하여 빠르게 실행

echo "================================================"
echo "🚀 금강 2.0 테스트 서버 시작"
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 백엔드 디렉토리로 이동
BACKEND_DIR="/home/duksan/바탕화면/gumgang_0_5/backend"
cd "$BACKEND_DIR"

echo -e "${BLUE}📁 작업 디렉토리: $(pwd)${NC}"

# 가상환경 활성화
echo -e "${BLUE}🔧 가상환경 활성화 중...${NC}"
source venv/bin/activate

# 테스트 서버 실행
echo -e "${GREEN}✅ 테스트 서버를 시작합니다!${NC}"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📡 서버 주소: http://localhost:8001${NC}"
echo -e "${GREEN}📚 API 문서: http://localhost:8001/docs${NC}"
echo -e "${GREEN}💬 채팅 페이지: http://localhost:3000/chat${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Ctrl+C로 서버를 종료할 수 있습니다.${NC}"
echo ""

# 테스트 서버 실행
python test_server.py
