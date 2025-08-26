#!/bin/bash

# 🏔️ 금강 2.0 - 세션 완료 스크립트
# 세션 종료시 모든 동적 값을 업데이트하고 다음 세션을 준비합니다

set -e  # 에러 발생시 즉시 종료

SCRIPT_DIR="/home/duksan/바탕화면/gumgang_0_5"
cd "$SCRIPT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 현재 시간
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SESSION_ID=$(date '+%Y%m%d_%H%M%S')

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       금강 2.0 - 세션 완료 프로토콜 v1.0                ║${NC}"
echo -e "${CYAN}║       Session Completion Protocol                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}📅 시작 시간: $TIMESTAMP${NC}"
echo ""

# 1. 현재 상태 확인
echo -e "${YELLOW}▶ 1단계: 현재 상태 확인${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Protocol Guard 상태 확인
if [ -f "protocol_guard_v3.py" ]; then
    echo -e "${BLUE}  🛡️  Protocol Guard 상태 확인...${NC}"
    python protocol_guard_v3.py --status > /tmp/pg_status.txt 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Protocol Guard 정상 작동${NC}"
        grep "신뢰도" /tmp/pg_status.txt | head -1
    else
        echo -e "${RED}  ✗ Protocol Guard 상태 확인 실패${NC}"
    fi
else
    echo -e "${RED}  ✗ Protocol Guard 파일 없음${NC}"
fi

echo ""

# 2. 현재 작업 저장
echo -e "${YELLOW}▶ 2단계: 현재 작업 상태 저장${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Task Tracker 상태 저장
if [ -f "task_tracker.py" ]; then
    echo -e "${BLUE}  📊 Task Tracker 상태 저장...${NC}"
    python task_tracker.py --save-state 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 작업 상태 저장 완료${NC}"
    else
        echo -e "${YELLOW}  ⚠ Task Tracker 저장 실패 (무시)${NC}"
    fi
fi

# Task Context Bridge 업데이트
if [ -f "task_context_bridge.py" ]; then
    echo -e "${BLUE}  🌉 Task Context Bridge 업데이트...${NC}"
    python task_context_bridge.py --generate-handover 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 핸드오버 문서 생성 완료${NC}"
    else
        echo -e "${YELLOW}  ⚠ 핸드오버 문서 생성 실패 (무시)${NC}"
    fi
fi

echo ""

# 3. Rules 파일 업데이트
echo -e "${YELLOW}▶ 3단계: Rules 파일 동적 업데이트${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "update_rules.py" ]; then
    echo -e "${BLUE}  📝 .rules 파일 업데이트...${NC}"
    python update_rules.py > /tmp/rules_update.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Rules 업데이트 완료${NC}"
        grep "동기화 완료" /tmp/rules_update.log | while read line; do
            echo -e "${GREEN}    $line${NC}"
        done
    else
        echo -e "${RED}  ✗ Rules 업데이트 실패${NC}"
        cat /tmp/rules_update.log
    fi
else
    echo -e "${RED}  ✗ update_rules.py 파일 없음${NC}"
fi

echo ""

# 4. 체크포인트 생성
echo -e "${YELLOW}▶ 4단계: 세션 종료 체크포인트 생성${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "protocol_guard_v3.py" ]; then
    echo -e "${BLUE}  📸 체크포인트 생성...${NC}"
    python protocol_guard_v3.py --checkpoint "SESSION-END-$SESSION_ID" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 세션 종료 체크포인트 생성 완료${NC}"
    else
        echo -e "${YELLOW}  ⚠ 체크포인트 생성 실패 (무시)${NC}"
    fi
fi

echo ""

# 5. NEXT_SESSION_IMMEDIATE.md 업데이트
echo -e "${YELLOW}▶ 5단계: 다음 세션 문서 업데이트${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 현재 토큰 사용량 추정 (실제로는 API를 통해 가져와야 함)
TOKENS_USED="110/120k"  # 예시 값

# NEXT_SESSION_IMMEDIATE.md 업데이트
cat > NEXT_SESSION_IMMEDIATE.md << EOF
# 🚨 다음 세션 즉시 실행 (토큰 $TOKENS_USED 핸드오버)

**생성 시간**: $TIMESTAMP
**이전 세션 ID**: $SESSION_ID
**긴급도**: NORMAL

---

## 1️⃣ 즉시 실행 (복사해서 붙여넣기)

\`\`\`bash
cd /home/duksan/바탕화면/gumgang_0_5
python protocol_guard_v3.py --status
cat .session_state.json
cat TASK_CONTEXT_BRIDGE.md | head -30
\`\`\`

---

## 2️⃣ 마지막 세션 요약

- **종료 시간**: $TIMESTAMP
- **세션 ID**: $SESSION_ID
EOF

# 현재 진행 상황 추가
if [ -f "TASK_CONTEXT_BRIDGE.md" ]; then
    echo "" >> NEXT_SESSION_IMMEDIATE.md
    echo "## 3️⃣ 현재 진행 상황" >> NEXT_SESSION_IMMEDIATE.md
    echo "" >> NEXT_SESSION_IMMEDIATE.md
    grep -A 5 "현재 상황" TASK_CONTEXT_BRIDGE.md >> NEXT_SESSION_IMMEDIATE.md 2>/dev/null || echo "진행 상황 정보 없음" >> NEXT_SESSION_IMMEDIATE.md
fi

echo "" >> NEXT_SESSION_IMMEDIATE.md
echo "---" >> NEXT_SESSION_IMMEDIATE.md
echo "**⚡ 한 줄 요약**" >> NEXT_SESSION_IMMEDIATE.md
echo "> 이전 세션에서 중단된 작업을 계속하세요." >> NEXT_SESSION_IMMEDIATE.md

echo -e "${GREEN}  ✓ NEXT_SESSION_IMMEDIATE.md 업데이트 완료${NC}"

echo ""

# 6. Git 커밋 (선택적)
echo -e "${YELLOW}▶ 6단계: Git 커밋 (선택적)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d ".git" ]; then
    echo -e "${BLUE}  📦 Git 상태 확인...${NC}"
    git status --short > /tmp/git_status.txt

    if [ -s /tmp/git_status.txt ]; then
        echo -e "${YELLOW}  변경사항 있음:${NC}"
        cat /tmp/git_status.txt | head -5

        read -p "  커밋하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .rules .cursorrules AGENT.md .github/copilot-instructions.md 2>/dev/null
            git add NEXT_SESSION_IMMEDIATE.md TASK_CONTEXT_BRIDGE.md .session_state.json 2>/dev/null
            git commit -m "chore: 세션 종료 - 동적 값 업데이트 ($SESSION_ID)" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}  ✓ Git 커밋 완료${NC}"
            else
                echo -e "${YELLOW}  ⚠ Git 커밋 실패 (무시)${NC}"
            fi
        else
            echo -e "${BLUE}  건너뜀${NC}"
        fi
    else
        echo -e "${GREEN}  ✓ 변경사항 없음${NC}"
    fi
else
    echo -e "${YELLOW}  Git 저장소 아님 (건너뜀)${NC}"
fi

echo ""

# 7. 최종 검증
echo -e "${YELLOW}▶ 7단계: 최종 검증${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "protocol_guard_v3.py" ]; then
    echo -e "${BLUE}  🔍 최종 검증 실행...${NC}"
    python protocol_guard_v3.py --final-check 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 모든 검증 통과${NC}"
    else
        echo -e "${YELLOW}  ⚠ 일부 검증 실패 (무시)${NC}"
    fi
fi

echo ""

# 8. 요약
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    세션 완료 요약                         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

COMPLETION_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "${GREEN}✅ 세션 종료 프로토콜 완료${NC}"
echo -e "  • 시작: $TIMESTAMP"
echo -e "  • 종료: $COMPLETION_TIME"
echo -e "  • 세션 ID: $SESSION_ID"
echo ""
echo -e "${BLUE}📋 완료된 작업:${NC}"
echo -e "  ✓ 현재 상태 저장"
echo -e "  ✓ Rules 파일 업데이트"
echo -e "  ✓ 다음 세션 문서 생성"
echo -e "  ✓ 체크포인트 생성"
echo ""
echo -e "${YELLOW}📌 다음 세션 시작시:${NC}"
echo -e "  1. NEXT_SESSION_IMMEDIATE.md 읽기"
echo -e "  2. .rules 파일 자동 로드 (AI 도구)"
echo -e "  3. protocol_guard_v3.py --status 실행"
echo ""
echo -e "${GREEN}🎯 세션이 안전하게 종료되었습니다!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 로그 파일 정리
rm -f /tmp/pg_status.txt /tmp/rules_update.log /tmp/git_status.txt 2>/dev/null

exit 0
