#!/bin/bash
# 금강 프로젝트 개발 환경 자동 설정 스크립트 (v3, 상세 로깅 및 진단 기능 포함)

# --- 0. 설정 및 로깅 준비 ---
set -e # 오류 발생 시 즉시 스크립트 중단
LOG_FILE="$HOME/gumgang_setup_log_$(date +%Y%m%d_%H%M%S).txt"
exec &> >(tee -a "$LOG_FILE") # 모든 출력을 파일과 터미널에 동시에 기록

echo "금강 프로젝트 개발 환경 설정을 시작합니다... (v3)"
echo "상세 로그는 다음 파일에 기록됩니다: $LOG_FILE"
echo "--------------------------------------------------"

# --- 1. 사전 진단 ---
echo "[1/5] 시스템 환경을 사전 진단합니다..."
command -v gnome-terminal >/dev/null 2>&1 || { echo >&2 "진단 실패: 'gnome-terminal'을 찾을 수 없습니다."; exit 1; }
command -v tmux >/dev/null 2>&1 || { echo >&2 "진단 실패: 'tmux'를 찾을 수 없습니다."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "진단 실패: 'node'를 찾을 수 없습니다."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "진단 실패: 'npm'을 찾을 수 없습니다."; exit 1; }
echo "✅ 사전 진단 통과: 필요한 모든 명령어를 찾았습니다."

# --- 변수 정의 ---
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ICON_NAME="icon_geumgang.svg"
ICON_PATH="$SCRIPT_DIR/status/resources/$ICON_NAME"
AUTOSTART_DIR="$HOME/.config/autostart"
LAUNCHER_DIR="$HOME/.local/share/applications"

# --- 2. 아이콘 파일 생성 ---
echo "[2/5] 금강 SVG 아이콘을 생성합니다..."
mkdir -p "$SCRIPT_DIR/status/resources"
cat << 'EOF' > "$ICON_PATH"
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#00F2FE;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4C67F8;stop-opacity:1" />
        </linearGradient>
    </defs>
    <path d="M128 24L32 96L128 232L224 96L128 24Z" fill="url(#grad1)" stroke="#D1D5DB" stroke-width="4"/>
    <path d="M128 24V232" stroke="white" stroke-opacity="0.5" stroke-width="2"/>
    <path d="M32 96L224 96" stroke="white" stroke-opacity="0.5" stroke-width="2"/>
    <path d="M80 96L128 24L176 96L128 144L80 96Z" fill="white" fill-opacity="0.1"/>
</svg>
EOF
echo "✅ 아이콘 파일 생성 완료: $ICON_PATH"

# --- 3. Tmux 세션 자동 시작 설정 ---
echo "[3/5] 컴퓨터 부팅 시 tmux 서버가 자동 시작되도록 설정합니다..."
mkdir -p "$AUTOSTART_DIR"
cat << EOF > "$AUTOSTART_DIR/gumgang-autostart.desktop"
[Desktop Entry]
Type=Application
Name=Gumgang Autostart
Exec=bash -c "cd '$SCRIPT_DIR' && tmux start-server && tmux new-session -d -s gumgang './scripts/dev_all.sh'"
Comment=Starts Gumgang project servers in a detached tmux session.
X-GNOME-Autostart-enabled=true
EOF
echo "✅ 자동 시작 설정 완료: $AUTOSTART_DIR/gumgang-autostart.desktop"

# --- 4. '금강 제어반' 바로가기 아이콘 생성 ---
echo "[4/5] 도크에 추가할 '금강 제어반' 바로가기를 생성합니다..."
mkdir -p "$LAUNCHER_DIR"
cat << EOF > "$LAUNCHER_DIR/gumgang-control.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=금강 제어반
Comment=금강 프로젝트 tmux 세션에 접속합니다
Exec=gnome-terminal --title="금강 제어반" --maximize -- tmux new-session -A -s gumgang
Icon=$ICON_PATH
Terminal=false
Categories=Development;
EOF
echo "✅ 제어반 바로가기 생성 완료: $LAUNCHER_DIR/gumgang-control.desktop"

# --- 5. 최종 권한 부여 및 확인 ---
echo "[5/5] 최종 권한을 부여하고 설정을 확인합니다..."
chmod +x "$LAUNCHER_DIR/gumgang-control.desktop"
echo "✅ 실행 권한 부여 완료."

# 데스크톱 데이터베이스 업데이트 (아이콘 즉시 반영을 위함)
if command -v update-desktop-database >/dev/null 2>&1; then
    echo "데스크톱 데이터베이스를 업데이트하여 아이콘을 즉시 적용합니다..."
    update-desktop-database "$LAUNCHER_DIR"
    echo "✅ 데이터베이스 업데이트 완료."
fi

echo "---"
echo "🎉 모든 설정이 성공적으로 완료되었습니다!"
echo "상세 로그는 다음 파일에서 확인하실 수 있습니다: $LOG_FILE"
echo "이제 다음 절차를 따라주십시오:"
echo "1. 컴퓨터를 재부팅하거나, 로그아웃 후 다시 로그인하십시오."
echo "2. '모든 프로그램 보기'에서 '금강 제어반'을 찾아 실행하십시오."
echo "3. 왼쪽 도크에 나타난 아이콘에 마우스를 올리고, 오른쪽 클릭 후 '즐겨찾기에 추가'를 선택하여 고정하십시오."
