#!/bin/bash

echo "🧪 [Dry-Run] 금강 Chroma DB 정리 시뮬레이션 시작..."
echo "📦 중복된 chroma.sqlite3 파일들을 점검 중입니다..."

# 백업 경로 (실제 적용 시 사용할 예정)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backup_chroma_duplicates_$TIMESTAMP"

# 정리 대상 경로 목록 (실제 인게스트 경로 제외)
DUPLICATE_PATHS=(
  "./backend/memory/sources/chroma.sqlite3"
  "./backend/memory/sources/chatgpt/backend/memory/vectors/chatgpt_memory/chroma.sqlite3"
  "./memory/vectors/chatgpt_memory/chroma.sqlite3"
)

# 시작
for FILE_PATH in "${DUPLICATE_PATHS[@]}"; do
  if [ -f "$FILE_PATH" ]; then
    echo "🔍 발견: $FILE_PATH"
    echo "📦 백업 예정: $BACKUP_DIR/$(basename $(dirname $FILE_PATH))_chroma.sqlite3"
    echo "❌ 삭제 예정: $FILE_PATH"
  else
    echo "✅ 없음 (무시): $FILE_PATH"
  fi
done

echo ""
echo "🧪 [Dry-Run] 완료 — 실제 파일은 이동/삭제되지 않았습니다."
echo "⚠️ 정리할 대상 수동 확인 후, 실제 적용 스크립트를 실행해주세요."
