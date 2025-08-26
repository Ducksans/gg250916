#!/bin/bash

# 🚀 Gumgang Backend 자동 시작 설정 스크립트
# 목적: .bashrc/.zshrc에 자동 시작 코드 추가
# 효과: 새 터미널/세션 열 때마다 백엔드 자동 확인 및 시작

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AUTO_START_SCRIPT="$SCRIPT_DIR/auto_start_backend.sh"
USER_HOME="/home/duksan"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Gumgang Backend 자동 시작 설정 마법사      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 1. auto_start_backend.sh 파일 확인
if [ ! -f "$AUTO_START_SCRIPT" ]; then
    echo -e "${RED}❌ auto_start_backend.sh 파일을 찾을 수 없습니다${NC}"
    echo -e "${YELLOW}   경로: $AUTO_START_SCRIPT${NC}"
    exit 1
fi

# 2. 실행 권한 확인
if [ ! -x "$AUTO_START_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  실행 권한 추가 중...${NC}"
    chmod +x "$AUTO_START_SCRIPT"
fi

# 3. 추가할 코드 준비
BASHRC_CODE="
# ═══════════════════════════════════════════════════════════════
# Gumgang 2.0 Backend Auto-Start Configuration
# Added: $(date '+%Y-%m-%d %H:%M:%S')
# Purpose: 새 세션 진입시 백엔드 자동 확인 및 시작
# ═══════════════════════════════════════════════════════════════

# Gumgang 백엔드 자동 시작 함수
gumgang_auto_start() {
    # 조용히 백엔드 상태 확인 및 필요시 시작
    $AUTO_START_SCRIPT auto 2>/dev/null
}

# 터미널이 인터랙티브 모드일 때만 실행
if [[ \$- == *i* ]]; then
    # SSH 세션이거나 새 터미널일 때 실행
    if [ -n \"\$SSH_CLIENT\" ] || [ -n \"\$SSH_TTY\" ] || [ -z \"\$GUMGANG_CHECKED\" ]; then
        export GUMGANG_CHECKED=1
        gumgang_auto_start
    fi
fi

# Gumgang 백엔드 관리 별칭 (Aliases)
alias gumgang='$AUTO_START_SCRIPT'
alias gumgang-start='$AUTO_START_SCRIPT start'
alias gumgang-stop='$AUTO_START_SCRIPT stop'
alias gumgang-restart='$AUTO_START_SCRIPT restart'
alias gumgang-status='$AUTO_START_SCRIPT status'
alias gumgang-logs='$AUTO_START_SCRIPT logs'
alias gumgang-errors='$AUTO_START_SCRIPT errors'

# 빠른 프로젝트 이동
alias cdgumgang='cd $SCRIPT_DIR'
alias cdbackend='cd $SCRIPT_DIR/backend'
alias cdfrontend='cd $SCRIPT_DIR/gumgang-v2'

# API 테스트 별칭
alias test-api='curl -s http://localhost:8001/health | python3 -m json.tool'
alias test-protocol='curl -s http://localhost:8001/api/protocol/health | python3 -m json.tool'

# ═══════════════════════════════════════════════════════════════
"

# 4. .bashrc 업데이트
echo -e "${BLUE}📝 .bashrc 업데이트 중...${NC}"
BASHRC_FILE="$USER_HOME/.bashrc"

if [ -f "$BASHRC_FILE" ]; then
    # 이미 설정이 있는지 확인
    if grep -q "Gumgang 2.0 Backend Auto-Start" "$BASHRC_FILE"; then
        echo -e "${YELLOW}   이미 설정되어 있습니다. 업데이트 중...${NC}"
        # 기존 설정 제거
        sed -i '/# ═══════════════════════════════════════════════════════════════/,/# ═══════════════════════════════════════════════════════════════/d' "$BASHRC_FILE"
    fi

    # 새 설정 추가
    echo "$BASHRC_CODE" >> "$BASHRC_FILE"
    echo -e "${GREEN}   ✅ .bashrc 업데이트 완료${NC}"
else
    echo -e "${YELLOW}   .bashrc 파일이 없습니다${NC}"
fi

# 5. .zshrc 업데이트 (있는 경우)
ZSHRC_FILE="$USER_HOME/.zshrc"
if [ -f "$ZSHRC_FILE" ]; then
    echo -e "${BLUE}📝 .zshrc 업데이트 중...${NC}"

    if grep -q "Gumgang 2.0 Backend Auto-Start" "$ZSHRC_FILE"; then
        echo -e "${YELLOW}   이미 설정되어 있습니다. 업데이트 중...${NC}"
        # 기존 설정 제거
        sed -i '/# ═══════════════════════════════════════════════════════════════/,/# ═══════════════════════════════════════════════════════════════/d' "$ZSHRC_FILE"
    fi

    # 새 설정 추가
    echo "$BASHRC_CODE" >> "$ZSHRC_FILE"
    echo -e "${GREEN}   ✅ .zshrc 업데이트 완료${NC}"
fi

# 6. cron 작업 추가 (선택적 - 5분마다 헬스체크)
echo -e "${BLUE}📅 Cron 모니터링 설정...${NC}"

# 모니터링 스크립트 생성
MONITOR_SCRIPT="$SCRIPT_DIR/monitor_backend_cron.sh"
cat > "$MONITOR_SCRIPT" << EOF
#!/bin/bash
# Gumgang Backend 모니터링 (Cron)
# 5분마다 실행되어 백엔드 상태 확인

LOG_FILE="$SCRIPT_DIR/backend/logs/monitor.log"

# 백엔드 체크 및 자동 재시작
if ! curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - Backend down, restarting..." >> "\$LOG_FILE"
    $AUTO_START_SCRIPT start >> "\$LOG_FILE" 2>&1
else
    # 정상 작동 로그 (하루에 한 번만)
    HOUR=\$(date +%H)
    if [ "\$HOUR" = "09" ]; then
        LAST_LOG=\$(tail -1 "\$LOG_FILE" 2>/dev/null | grep "Backend OK" | cut -d' ' -f1)
        TODAY=\$(date +%Y-%m-%d)
        if [ "\$LAST_LOG" != "\$TODAY" ]; then
            echo "\$(date '+%Y-%m-%d %H:%M:%S') - Backend OK" >> "\$LOG_FILE"
        fi
    fi
fi
EOF

chmod +x "$MONITOR_SCRIPT"

# Cron 작업 추가
CRON_JOB="*/5 * * * * $MONITOR_SCRIPT"
(crontab -l 2>/dev/null | grep -v "$MONITOR_SCRIPT"; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}   ✅ Cron 모니터링 설정 완료 (5분마다 체크)${NC}"

# 7. systemd 사용자 서비스 생성 (선택적)
echo -e "${BLUE}🔧 Systemd 사용자 서비스 생성...${NC}"

SYSTEMD_USER_DIR="$USER_HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

cat > "$SYSTEMD_USER_DIR/gumgang-backend.service" << EOF
[Unit]
Description=Gumgang 2.0 Backend (User Service)
After=network.target

[Service]
Type=forking
WorkingDirectory=$SCRIPT_DIR/backend
ExecStart=$AUTO_START_SCRIPT start
ExecStop=$AUTO_START_SCRIPT stop
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF

# systemd 사용자 데몬 리로드
systemctl --user daemon-reload 2>/dev/null || true
echo -e "${GREEN}   ✅ Systemd 사용자 서비스 생성 완료${NC}"

# 8. 현재 셸에서 즉시 적용
echo -e "${BLUE}🔄 현재 셸에 설정 적용 중...${NC}"
if [ -n "$BASH_VERSION" ]; then
    source "$BASHRC_FILE"
elif [ -n "$ZSH_VERSION" ]; then
    source "$ZSHRC_FILE"
fi

# 9. 백엔드 시작 (아직 실행 중이 아니라면)
echo -e "${BLUE}🚀 백엔드 상태 확인...${NC}"
if $AUTO_START_SCRIPT check; then
    echo -e "${GREEN}   ✅ 백엔드가 이미 실행 중입니다${NC}"
else
    echo -e "${YELLOW}   백엔드 시작 중...${NC}"
    $AUTO_START_SCRIPT start
fi

# 10. 완료 메시지
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ 자동 시작 설정 완료!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📌 설정된 기능:${NC}"
echo -e "  • 새 터미널 열 때 자동 백엔드 확인"
echo -e "  • SSH 세션 시작시 자동 백엔드 시작"
echo -e "  • 5분마다 헬스체크 (cron)"
echo -e "  • Systemd 사용자 서비스"
echo ""
echo -e "${BLUE}🎯 사용 가능한 명령어:${NC}"
echo -e "  ${GREEN}gumgang${NC}         - 백엔드 관리 도구"
echo -e "  ${GREEN}gumgang-status${NC}  - 상태 확인"
echo -e "  ${GREEN}gumgang-logs${NC}    - 실시간 로그"
echo -e "  ${GREEN}gumgang-restart${NC} - 재시작"
echo -e "  ${GREEN}cdgumgang${NC}       - 프로젝트로 이동"
echo -e "  ${GREEN}test-api${NC}        - API 테스트"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo -e "  • 새 터미널을 열어 자동 시작을 테스트하세요"
echo -e "  • 'gumgang-status'로 언제든 상태를 확인하세요"
echo -e "  • 문제 발생시 'gumgang-errors'로 에러 로그 확인"
echo ""
echo -e "${GREEN}🎉 이제 새 세션에서 백엔드 재시작을 걱정할 필요가 없습니다!${NC}"
echo -e "${GREEN}   매 세션 2-3분 절약 = 연간 100시간 절약!${NC}"
