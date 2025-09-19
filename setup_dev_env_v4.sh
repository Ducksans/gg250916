#!/bin/bash
# 금강 프로젝트 개발 환경 자동 설정 스크립트 (v4, 환경 로딩 및 안정성 강화)

set -e

if [ -z "${ALLOW_SETUP_RERUN:-}" ]; then
  echo "[DEPRECATED] setup_dev_env_v4.sh 는 이미 환경이 구성된 상태에서는 재실행하지 않습니다." >&2
  echo "            정말 다시 실행하려면 'ALLOW_SETUP_RERUN=1 ./setup_dev_env_v4.sh' 형태로 호출하세요." >&2
  exit 1
fi
LOG_FILE="$HOME/gumgang_setup_log_$(date +%Y%m%d_%H%M%S).txt"
exec &> >(tee -a "$LOG_FILE")

echo "금강 프로젝트 개발 환경 설정을 시작합니다... (v4)"
echo "상세 로그는 다음 파일에 기록됩니다: $LOG_FILE"
echo "--------------------------------------------------"

# --- 1. 사전 진단 ---
echo "[1/6] 시스템 환경을 사전 진단합니다..."
command -v gnome-terminal >/dev/null 2>&1 || { echo >&2 "진단 실패: 'gnome-terminal'을 찾을 수 없습니다."; exit 1; }
command -v tmux >/dev/null 2>&1 || { echo >&2 "진단 실패: 'tmux'를 찾을 수 없습니다."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "진단 실패: 'node'를 찾을 수 없습니다."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "진단 실패: 'npm'을 찾을 수 없습니다."; exit 1; }
echo "✅ 사전 진단 통과."

# --- 변수 정의 ---
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ICON_NAME="icon_geumgang.svg"
ICON_PATH="$SCRIPT_DIR/status/resources/$ICON_NAME"
AUTOSTART_DIR="$HOME/.config/autostart"
LAUNCHER_DIR="$HOME/.local/share/applications"
WRAPPER_SCRIPT_PATH="$SCRIPT_DIR/autostart_wrapper.sh"

# --- 2. 아이콘 파일 생성 ---
echo "[2/6] 금강 SVG 아이콘을 생성합니다..."
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
echo "✅ 아이콘 파일 생성 완료."

# --- 3. 자동 시작 '래퍼(Wrapper)' 스크립트 생성 ---
echo "[3/6] 안정적인 자동 실행을 위한 래퍼 스크립트를 생성합니다..."
cat << EOF > "$WRAPPER_SCRIPT_PATH"
#!/bin/bash
# 자동 시작 환경의 문제를 해결하기 위한 래퍼 스크립트
# 상세 로그: \$HOME/gumgang_autostart_log.txt

# 사용자 환경 변수(nvm 등)를 명시적으로 로드합니다.
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

# 프로젝트 디렉토리로 이동합니다.
cd '$SCRIPT_DIR'

# tmux 세션을 시작하고, 모든 출력을 로그 파일로 리디렉션합니다.
tmux start-server
tmux new-session -d -s gumgang './scripts/dev_all.sh' &> "\$HOME/gumgang_autostart_log.txt"
EOF
chmod +x "$WRAPPER_SCRIPT_PATH"
echo "✅ 래퍼 스크립트 생성 완료: $WRAPPER_SCRIPT_PATH"

# --- 4. Tmux 세션 자동 시작 설정 (래퍼 사용하도록 수정) ---
echo "[4/6] 자동 시작 설정이 새로운 래퍼 스크립트를 사용하도록 업데이트합니다..."
mkdir -p "$AUTOSTART_DIR"
cat << EOF > "$AUTOSTART_DIR/gumgang-autostart.desktop"
[Desktop Entry]
Type=Application
Name=Gumgang Autostart
Exec=$WRAPPER_SCRIPT_PATH
Comment=Starts Gumgang project servers in a detached tmux session.
X-GNOME-Autostart-enabled=true
EOF
echo "✅ 자동 시작 설정 업데이트 완료."

# --- 5. '금강 제어반' 바로가기 아이콘 생성 (접속 명령어 수정) ---
echo "[5/6] '금강 제어반' 바로가기가 세션에 정확히 접속하도록 수정합니다..."
mkdir -p "$LAUNCHER_DIR"
cat << EOF > "$LAUNCHER_DIR/gumgang-control.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=금강 제어반
Comment=금강 프로젝트 tmux 세션에 접속합니다
Exec=gnome-terminal --title="금강 제어반" --maximize -- tmux attach-session -t gumgang
Icon=$ICON_PATH
Terminal=false
Categories=Development;
EOF
chmod +x "$LAUNCHER_DIR/gumgang-control.desktop"
echo "✅ 제어반 바로가기 수정 완료."

# --- 6. 최종 확인 ---
echo "[6/6] 최종 설정을 확인합니다..."
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$LAUNCHER_DIR"
    echo "✅ 데스크톱 데이터베이스 업데이트 완료."
fi

echo "---"
echo "🎉 모든 설정이 성공적으로 완료되었습니다!"
echo "상세 로그는 다음 파일에서 확인하실 수 있습니다: $LOG_FILE"
echo "이제 다음 절차를 따라주십시오:"
echo "1. 현재 실행 중인 tmux 세션을 종료하겠습니다. 터미널에 'tmux kill-server'를 입력하십시오."
echo "2. 컴퓨터를 재부팅하거나, 로그아웃 후 다시 로그인하십시오."
echo "3. 도크의 '금강 제어반' 아이콘을 클릭하여 모든 서버가 정상 실행되는지 확인하십시오."
