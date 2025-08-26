#!/bin/bash

# 🚀 Gumgang 2.0 Backend 서비스 설치 스크립트
# 작업: 백엔드 자동 시작 시스템 구축
# 목적: 새 세션 진입시 시간 로스 제거

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
SERVICE_FILE="$SCRIPT_DIR/gumgang-backend.service"
SYSTEMD_DIR="/etc/systemd/system"
LOG_DIR="$BACKEND_DIR/logs"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Gumgang 2.0 Backend 자동 시작 설치 마법사   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 1. 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  sudo 권한이 필요합니다. sudo로 다시 실행합니다...${NC}"
    sudo "$0" "$@"
    exit $?
fi

# 2. 로그 디렉토리 생성
echo -e "${BLUE}📁 로그 디렉토리 생성...${NC}"
mkdir -p "$LOG_DIR"
chown duksan:duksan "$LOG_DIR"

# 3. 기존 서비스 중지 (있다면)
echo -e "${BLUE}🛑 기존 서비스 확인...${NC}"
if systemctl is-active --quiet gumgang-backend; then
    echo -e "${YELLOW}   기존 서비스 중지 중...${NC}"
    systemctl stop gumgang-backend
fi

# 4. 기존 프로세스 정리
echo -e "${BLUE}🧹 기존 프로세스 정리...${NC}"
pkill -f simple_main.py 2>/dev/null || true
pkill -f "uvicorn simple_main" 2>/dev/null || true
sleep 2

# 5. 서비스 파일 복사
echo -e "${BLUE}📋 서비스 파일 설치...${NC}"
cp "$SERVICE_FILE" "$SYSTEMD_DIR/"
chmod 644 "$SYSTEMD_DIR/gumgang-backend.service"

# 6. systemd 리로드
echo -e "${BLUE}🔄 systemd 데몬 리로드...${NC}"
systemctl daemon-reload

# 7. 서비스 활성화 및 시작
echo -e "${BLUE}🚀 서비스 활성화 및 시작...${NC}"
systemctl enable gumgang-backend
systemctl start gumgang-backend

# 8. 상태 확인
sleep 3
echo -e "${BLUE}📊 서비스 상태 확인...${NC}"
if systemctl is-active --quiet gumgang-backend; then
    echo -e "${GREEN}✅ 서비스가 성공적으로 시작되었습니다!${NC}"
    systemctl status gumgang-backend --no-pager | head -15
else
    echo -e "${RED}❌ 서비스 시작 실패${NC}"
    echo -e "${YELLOW}로그 확인:${NC}"
    journalctl -u gumgang-backend -n 20 --no-pager
    exit 1
fi

# 9. 헬스 체크
echo -e "${BLUE}🏥 헬스 체크 수행...${NC}"
sleep 2
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API 서버 정상 응답!${NC}"
    curl -s http://localhost:8001/health | python3 -m json.tool
else
    echo -e "${YELLOW}⚠️  API 응답 대기 중...${NC}"
fi

# 10. 자동 시작 확인 스크립트 추가
echo -e "${BLUE}🔧 셸 설정 업데이트...${NC}"

# bashrc 업데이트
BASHRC_CHECK='
# Gumgang Backend Auto-Check (Added by install_service.sh)
check_gumgang_backend() {
    if ! systemctl is-active --quiet gumgang-backend; then
        echo "⚠️  Gumgang backend is not running. Starting..."
        sudo systemctl start gumgang-backend
    fi
}
# Auto-check on terminal open
if [ -t 1 ]; then
    check_gumgang_backend 2>/dev/null || true
fi
'

# 사용자 홈 디렉토리 찾기
USER_HOME="/home/duksan"

# .bashrc에 추가 (중복 방지)
if ! grep -q "check_gumgang_backend" "$USER_HOME/.bashrc" 2>/dev/null; then
    echo "$BASHRC_CHECK" >> "$USER_HOME/.bashrc"
    echo -e "${GREEN}   ✅ .bashrc 업데이트 완료${NC}"
fi

# .zshrc에도 추가 (있다면)
if [ -f "$USER_HOME/.zshrc" ]; then
    if ! grep -q "check_gumgang_backend" "$USER_HOME/.zshrc"; then
        echo "$BASHRC_CHECK" >> "$USER_HOME/.zshrc"
        echo -e "${GREEN}   ✅ .zshrc 업데이트 완료${NC}"
    fi
fi

# 11. 별칭 추가
ALIASES='
# Gumgang Backend Shortcuts
alias gumgang-status="systemctl status gumgang-backend"
alias gumgang-start="sudo systemctl start gumgang-backend"
alias gumgang-stop="sudo systemctl stop gumgang-backend"
alias gumgang-restart="sudo systemctl restart gumgang-backend"
alias gumgang-logs="journalctl -u gumgang-backend -f"
'

if ! grep -q "gumgang-status" "$USER_HOME/.bashrc" 2>/dev/null; then
    echo "$ALIASES" >> "$USER_HOME/.bashrc"
fi

# 12. 완료 메시지
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ 설치 완료!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📌 유용한 명령어:${NC}"
echo -e "  ${GREEN}gumgang-status${NC}  - 서비스 상태 확인"
echo -e "  ${GREEN}gumgang-logs${NC}    - 실시간 로그 보기"
echo -e "  ${GREEN}gumgang-restart${NC} - 서비스 재시작"
echo ""
echo -e "${BLUE}🔄 서비스 관리:${NC}"
echo -e "  sudo systemctl status gumgang-backend"
echo -e "  sudo systemctl restart gumgang-backend"
echo -e "  sudo journalctl -u gumgang-backend -f"
echo ""
echo -e "${YELLOW}💡 팁: 새 터미널을 열면 자동으로 백엔드 상태를 확인합니다${NC}"
echo -e "${YELLOW}    재부팅 후에도 백엔드가 자동으로 시작됩니다${NC}"
echo ""

# 13. 영구 모니터링 스크립트 생성
cat > "$SCRIPT_DIR/monitor_backend.sh" << 'EOF'
#!/bin/bash
# 백엔드 모니터링 스크립트 (cron에서 실행)

if ! curl -s http://localhost:8001/health > /dev/null 2>&1; then
    systemctl restart gumgang-backend
    echo "$(date): Backend restarted" >> /home/duksan/바탕화면/gumgang_0_5/backend/logs/monitor.log
fi
EOF
chmod +x "$SCRIPT_DIR/monitor_backend.sh"

# 14. Cron 작업 추가 (5분마다 체크)
CRON_JOB="*/5 * * * * $SCRIPT_DIR/monitor_backend.sh"
(crontab -u duksan -l 2>/dev/null | grep -v monitor_backend; echo "$CRON_JOB") | crontab -u duksan -

echo -e "${GREEN}✅ 모니터링 크론 작업 추가 완료 (5분마다 자동 체크)${NC}"
echo ""
echo -e "${GREEN}🎉 모든 설정이 완료되었습니다!${NC}"
echo -e "${GREEN}   이제 새 세션에서 백엔드 재시작 걱정이 없습니다!${NC}"
