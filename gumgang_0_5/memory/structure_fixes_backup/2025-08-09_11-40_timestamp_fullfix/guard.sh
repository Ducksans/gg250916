#!/bin/bash
# Protocol Guard 빠른 실행 스크립트
# Created: 2025-08-08
# Purpose: 할루시네이션 방지 및 Task Protocol 검증

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}🛡️  Task Protocol Guard - 빠른 검증${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"

# 1. 날짜 확인
echo -e "${BLUE}📅 시스템 날짜 확인:${NC}"
CURRENT_DATE=$(date "+%Y년 %m월 %d일 %H:%M:%S")
echo -e "   ${CURRENT_DATE}"
echo -e "   ${YELLOW}⚠️  Task는 2025년 8월 기준입니다${NC}\n"

# 2. 백엔드 상태 체크
echo -e "${BLUE}🌐 백엔드 상태 확인:${NC}"
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ 백엔드 서버 정상 작동 중 (포트 8001)${NC}"
    curl -s http://localhost:8001/health | python3 -m json.tool 2>/dev/null | head -5 || true
else
    echo -e "   ${RED}❌ 백엔드 오프라인${NC}"
    echo -e "   ${YELLOW}→ 시작하려면: python backend/simple_main.py${NC}"
fi
echo ""

# 3. Task Registry 확인
echo -e "${BLUE}📊 Task Registry 상태:${NC}"
if [ -f "task_tracking/master_registry.json" ]; then
    echo -e "   ${GREEN}✅ Registry 파일 존재${NC}"

    # Task Group B 상태 확인
    echo -e "\n   ${CYAN}Task Group B 현황:${NC}"
    python3 -c "
import json
try:
    with open('task_tracking/master_registry.json', 'r') as f:
        data = json.load(f)
        tasks = data.get('tasks', {})

        # Task Group B 찾기
        b_tasks = {
            'GG-20250108-005': '백엔드 안정화',
            'GG-20250108-006': 'Tauri 파일시스템',
            'GG-20250108-007': 'Monaco 에디터',
            'GG-20250108-008': '실시간 동기화',
            'GG-20250108-009': '3D 시각화',
            'GG-20250108-010': '테스트/문서화'
        }

        for tid, name in b_tasks.items():
            if tid in tasks:
                task = tasks[tid]
                status = task.get('status', 'unknown')
                progress = task.get('progress', 0)

                # 상태별 아이콘
                if status == 'completed':
                    icon = '✅'
                elif status == 'in_progress':
                    icon = '🔄'
                elif status == 'pending':
                    icon = '⏳'
                else:
                    icon = '❓'

                print(f'   {icon} {tid}: {name} ({progress}%)')
            else:
                print(f'   ❌ {tid}: {name} (없음)')
except Exception as e:
    print(f'   오류: {e}')
" || echo -e "   ${RED}Registry 파싱 실패${NC}"
else
    echo -e "   ${RED}❌ Registry 파일 없음${NC}"
    echo -e "   ${YELLOW}→ 생성하려면: python update_tasks_b.py${NC}"
fi
echo ""

# 4. Protocol Guard 실행
echo -e "${BLUE}🔍 Protocol 검증 실행:${NC}"
if [ -f "protocol_guard.py" ]; then
    python3 protocol_guard.py 2>/dev/null || {
        EXIT_CODE=$?
        echo -e "\n${RED}⚠️  Protocol 검증 실패!${NC}"
        echo -e "${YELLOW}자동 복구를 시도하시겠습니까? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            echo -e "${GREEN}🔧 자동 복구 실행 중...${NC}"
            python3 protocol_guard.py --auto-fix
        fi
        exit $EXIT_CODE
    }
else
    echo -e "   ${RED}❌ protocol_guard.py 파일 없음${NC}"
fi

# 5. AI 컨텍스트 파일 확인
echo -e "\n${BLUE}📋 AI 컨텍스트 파일:${NC}"
if [ -f ".ai_context" ]; then
    echo -e "   ${GREEN}✅ .ai_context 파일 존재${NC}"
    echo -e "   ${YELLOW}→ 다음 세션 시작 시 반드시 읽어주세요!${NC}"
    echo -e "\n   ${CYAN}주요 내용:${NC}"
    head -n 20 .ai_context | grep -E "^###|^-|Active Task:" | sed 's/^/   /'
else
    echo -e "   ${YELLOW}⚠️  .ai_context 파일 없음${NC}"
fi

# 6. 빠른 명령어 안내
echo -e "\n${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${GREEN}📝 빠른 명령어:${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "  ${YELLOW}백엔드 시작:${NC}     cd backend && python simple_main.py"
echo -e "  ${YELLOW}Task 업데이트:${NC}   python update_tasks_b.py"
echo -e "  ${YELLOW}자동 복구:${NC}       python protocol_guard.py --auto-fix"
echo -e "  ${YELLOW}스냅샷 생성:${NC}     python protocol_guard.py --recovery"
echo -e "  ${YELLOW}엄격 검증:${NC}       python protocol_guard.py --strict"
echo -e "${CYAN}================================================${NC}"

# 7. 토큰 사용량 경고
echo -e "\n${BOLD}${YELLOW}⚠️  토큰 사용량 주의:${NC}"
echo -e "  현재 세션: ~40k/120k (33%)"
echo -e "  남은 토큰: ~80k"
echo -e "  ${GREEN}권장: Task 006-007 집중 완료${NC}"

echo -e "\n${BOLD}${GREEN}✨ 검증 완료!${NC}"
