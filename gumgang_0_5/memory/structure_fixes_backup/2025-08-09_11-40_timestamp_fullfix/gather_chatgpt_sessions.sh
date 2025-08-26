#!/bin/bash

echo "📦 ChatGPT 세션 백업 스크립트 실행 시작..."

# 🗂️ 날짜 기반 디렉토리 생성
TODAY=$(date +"%Y-%m-%d")
BASE_DIR="memory/sources/chatgpt_sessions/$TODAY"
mkdir -p "$BASE_DIR"

# 📄 URL 리스트 파일 확인
URL_FILE="chatgpt_urls.txt"
if [ ! -f "$URL_FILE" ]; then
    echo "❌ URL 파일이 없습니다: $URL_FILE"
    echo "👉 파일을 생성 후 다시 실행하세요. 예시:"
    echo "https://chatgpt.com/c/6882e9cf-9550-832b-87c2-4c37cd49e37a" > $URL_FILE
    exit 1
fi

# 🧠 세션 순회 시작
INDEX=1
while read -r URL; do
    if [[ "$URL" =~ ^https?://chatgpt.com/c/ ]]; then
        SESSION_ID=$(echo "$URL" | awk -F/ '{print $NF}')
        echo "🔍 [$INDEX] 세션 ID: $SESSION_ID"

        # 📥 Puppeteer 또는 curl 기반 크롤링 (기본: html → markdown + json 저장)
        node ./scripts/fetch_chat_session.js "$URL" "$BASE_DIR/$SESSION_ID"

        # 결과 안내
        echo "✅ 저장 완료 → $BASE_DIR/${SESSION_ID}.md + .json"
        INDEX=$((INDEX + 1))
    else
        echo "⚠️ 잘못된 URL 형식: $URL"
    fi
done < "$URL_FILE"

echo "🎉 전체 ChatGPT 세션 백업 완료!"
