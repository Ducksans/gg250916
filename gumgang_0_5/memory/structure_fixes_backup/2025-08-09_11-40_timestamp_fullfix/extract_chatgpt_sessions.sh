#!/bin/bash

echo "🧠 ChatGPT 전체 세션 자동 추출 시작..."

# 📁 경로 설정
PROJECT_DIR="$HOME/바탕화면/gumgang_0_5"
SCRIPT_JS="$PROJECT_DIR/extract_chatgpt_sessions.js"
SAVE_DIR="$PROJECT_DIR/chatgpt_sessions"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/puppeteer_$(date +%Y%m%d_%H%M%S).log"
PROFILE_DIR="$HOME/.config/google-chrome/Profile 1"

# 📂 저장 폴더 없으면 생성
mkdir -p "$SAVE_DIR"
mkdir -p "$LOG_DIR"

echo "📂 세션 저장 경로: $SAVE_DIR"
echo "📝 로그 저장 경로: $LOG_FILE"

# 🧪 Node.js 설치 여부 확인
if ! command -v node &> /dev/null; then
  echo "❌ Node.js가 설치되어 있지 않습니다. 설치 후 다시 실행하세요."
  exit 1
fi

# 🧪 Puppeteer 설치 확인 (node_modules + package.json 기준)
if [ ! -d "$PROJECT_DIR/node_modules/puppeteer" ] || ! grep -q puppeteer "$PROJECT_DIR/package.json" 2>/dev/null; then
  echo "❗ puppeteer가 설치되지 않았습니다. 자동 설치를 진행합니다..."
  cd "$PROJECT_DIR"
  npm install puppeteer >> "$LOG_FILE" 2>&1
fi

# 🧪 JS 파일 존재 여부 확인
if [ ! -f "$SCRIPT_JS" ]; then
  echo "❌ JavaScript 파일이 없습니다: $SCRIPT_JS"
  exit 1
fi

# 🔐 Chrome 프로필 확인 (간접적 로그인 유무 판단)
if [ ! -f "$PROFILE_DIR/Preferences" ]; then
  echo "🔐 로그인된 Chrome 프로필이 아닙니다."
  echo "🌐 먼저 Chrome에서 ChatGPT에 로그인해 주세요: https://chat.openai.com"
  echo "🛑 작업을 중단합니다."
  exit 1
fi

# 🚀 실행
echo "🚀 Puppeteer 스크립트를 실행합니다..."
cd "$PROJECT_DIR"
node "$SCRIPT_JS" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "✅ 모든 작업 완료. 세션이 저장되었습니다."
else
  echo "⚠️ 오류가 발생했습니다. 아래 로그를 확인하세요:"
  echo "🔍 로그 파일: $LOG_FILE"
fi
