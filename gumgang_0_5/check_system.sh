#!/bin/bash

# 금강 2.0 시스템 상태 확인 스크립트
# System Status Check for Gumgang 2.0

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 스크립트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}       🏔️  금강 2.0 (Gumgang v2) - 시스템 상태 점검${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 현재 시간
echo -e "${BLUE}📅 점검 시간:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. 백엔드 서버 상태 확인
echo -e "${YELLOW}[1/5] 백엔드 서버 확인...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    BACKEND_STATUS=$(curl -s http://localhost:8000/health 2>/dev/null)
    echo -e "${GREEN}✅ 백엔드 서버: 정상 작동${NC}"
    echo -e "   └─ 포트: 8000"
    echo -e "   └─ 상태: $(echo $BACKEND_STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"

    # PID 확인
    BACKEND_PID=$(lsof -i:8000 -t 2>/dev/null | head -1)
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "   └─ PID: $BACKEND_PID"
    fi
else
    echo -e "${RED}❌ 백엔드 서버: 중지됨${NC}"
    echo -e "   └─ 시작: gumgang-start 또는 ./auto_start_backend.sh"
fi
echo ""

# 2. 프론트엔드 상태 확인
echo -e "${YELLOW}[2/5] 프론트엔드 확인...${NC}"
FRONTEND_RUNNING=false
FRONTEND_PORT=""

# 포트 3000 확인
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
    FRONTEND_PORT="3000"
# 포트 3001 확인
elif curl -s http://localhost:3001 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
    FRONTEND_PORT="3001"
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}✅ 프론트엔드: 정상 작동${NC}"
    echo -e "   └─ 포트: $FRONTEND_PORT"
    echo -e "   └─ URL: http://localhost:$FRONTEND_PORT"

    # Next.js 프로세스 확인
    NEXT_PID=$(lsof -i:$FRONTEND_PORT -t 2>/dev/null | head -1)
    if [ ! -z "$NEXT_PID" ]; then
        echo -e "   └─ PID: $NEXT_PID"
    fi
else
    echo -e "${RED}❌ 프론트엔드: 중지됨${NC}"
    echo -e "   └─ 시작: cd gumgang-v2 && npm run dev"
fi
echo ""

# 3. 터미널 서버 상태 확인
echo -e "${YELLOW}[3/5] 터미널 서버 확인...${NC}"
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    TERMINAL_STATUS=$(curl -s http://localhost:8002/health 2>/dev/null)
    TRUST_SCORE=$(echo $TERMINAL_STATUS | grep -o '"trust_score":[0-9.]*' | cut -d':' -f2)
    echo -e "${GREEN}✅ 터미널 서버: 정상 작동${NC}"
    echo -e "   └─ 포트: 8002"
    echo -e "   └─ 신뢰도: ${TRUST_SCORE}%"

    # PID 확인
    TERMINAL_PID=$(lsof -i:8002 -t 2>/dev/null | head -1)
    if [ ! -z "$TERMINAL_PID" ]; then
        echo -e "   └─ PID: $TERMINAL_PID"
    fi
else
    echo -e "${RED}❌ 터미널 서버: 중지됨${NC}"
    echo -e "   └─ 시작: python terminal_server.py"
fi
echo ""

# 4. Protocol Guard 상태 확인
echo -e "${YELLOW}[4/5] Protocol Guard 확인...${NC}"
if [ -f "$SCRIPT_DIR/protocol_guard_v3.py" ]; then
    # Protocol Guard 상태 확인
    PG_OUTPUT=$(python "$SCRIPT_DIR/protocol_guard_v3.py" --status 2>/dev/null | tail -5)
    if echo "$PG_OUTPUT" | grep -q "정상"; then
        echo -e "${GREEN}✅ Protocol Guard v3.0: 활성화${NC}"
        # 신뢰도 점수 추출
        TRUST=$(echo "$PG_OUTPUT" | grep -o '신뢰도: [0-9.]*' | cut -d' ' -f2)
        if [ ! -z "$TRUST" ]; then
            echo -e "   └─ 신뢰도: ${TRUST}%"
        fi
    else
        echo -e "${YELLOW}⚠️ Protocol Guard: 대기 상태${NC}"
    fi
else
    echo -e "${RED}❌ Protocol Guard: 파일 없음${NC}"
fi
echo ""

# 5. Git 상태 확인
echo -e "${YELLOW}[5/5] Git 저장소 확인...${NC}"
if [ -d "$SCRIPT_DIR/.git" ]; then
    cd "$SCRIPT_DIR"
    MODIFIED_FILES=$(git status --porcelain 2>/dev/null | wc -l)
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

    if [ "$MODIFIED_FILES" -eq 0 ]; then
        echo -e "${GREEN}✅ Git: 깨끗한 상태${NC}"
    else
        echo -e "${YELLOW}⚠️ Git: ${MODIFIED_FILES}개 파일 변경됨${NC}"
    fi
    echo -e "   └─ 브랜치: $CURRENT_BRANCH"

    # Python 파일 개수 확인
    PY_FILES=$(find . -name "*.py" -type f ! -path "./venv/*" ! -path "./.venv/*" ! -path "./backend/.venv/*" ! -path "./backend/venv/*" 2>/dev/null | wc -l)
    echo -e "   └─ Python 파일: $PY_FILES개"
else
    echo -e "${RED}❌ Git 저장소가 아닙니다${NC}"
fi
echo ""

# 시스템 리소스 확인
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 시스템 리소스${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 메모리 사용률
MEM_USAGE=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
MEM_TOTAL=$(free -h | awk 'NR==2{print $2}')
MEM_USED=$(free -h | awk 'NR==2{print $3}')
echo -e "💾 메모리: ${MEM_USED}/${MEM_TOTAL} (${MEM_USAGE}%)"

# 디스크 사용률
DISK_USAGE=$(df -h "$SCRIPT_DIR" | awk 'NR==2{print $5}')
DISK_AVAIL=$(df -h "$SCRIPT_DIR" | awk 'NR==2{print $4}')
echo -e "💿 디스크: 사용률 ${DISK_USAGE}, 여유 공간 ${DISK_AVAIL}"

# CPU 정보
CPU_COUNT=$(nproc)
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
echo -e "🖥️  CPU: ${CPU_COUNT} cores, Load:${LOAD_AVG}"
echo ""

# 전체 상태 요약
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 전체 상태 요약${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 서비스 카운트
SERVICES_RUNNING=0
SERVICES_TOTAL=3

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    ((SERVICES_RUNNING++))
fi
if [ "$FRONTEND_RUNNING" = true ]; then
    ((SERVICES_RUNNING++))
fi
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    ((SERVICES_RUNNING++))
fi

# 전체 상태 판단
if [ $SERVICES_RUNNING -eq $SERVICES_TOTAL ]; then
    echo -e "${GREEN}✅ 시스템 상태: 완전 정상 ($SERVICES_RUNNING/$SERVICES_TOTAL 서비스 실행 중)${NC}"
    echo -e "${GREEN}🚀 금강 2.0이 완전히 작동 중입니다!${NC}"
elif [ $SERVICES_RUNNING -gt 0 ]; then
    echo -e "${YELLOW}⚠️ 시스템 상태: 부분 작동 ($SERVICES_RUNNING/$SERVICES_TOTAL 서비스 실행 중)${NC}"
    echo -e "${YELLOW}일부 서비스를 시작해야 합니다.${NC}"
else
    echo -e "${RED}❌ 시스템 상태: 중지됨 (0/$SERVICES_TOTAL 서비스 실행 중)${NC}"
    echo -e "${RED}모든 서비스를 시작해야 합니다.${NC}"
fi
echo ""

# 빠른 명령어 안내
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚡ 빠른 명령어${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "백엔드 시작:    ${CYAN}gumgang-start${NC}"
echo -e "프론트엔드:     ${CYAN}cd gumgang-v2 && npm run dev${NC}"
echo -e "터미널 서버:    ${CYAN}python terminal_server.py${NC}"
echo -e "전체 로그:      ${CYAN}tail -f logs/*.log${NC}"
echo -e "상태 확인:      ${CYAN}./check_system.sh${NC}"
echo ""
