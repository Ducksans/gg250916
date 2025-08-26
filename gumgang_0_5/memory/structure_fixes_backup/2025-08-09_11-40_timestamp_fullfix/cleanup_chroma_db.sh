#!/bin/bash

echo "🧹 금강 Chroma DB 정리 시작..."

# 백업 디렉토리 생성
BACKUP_DIR="./backup_chroma_duplicates_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 보존할 파일 경로들 (절대/상대 경로 혼용 방지 위해 정규화)
KEEP1="./backend/memory/gumgang_memory/chroma.sqlite3"
KEEP2="./backend/memory/vectors/chatgpt_memory/chroma.sqlite3"

# 찾은 모든 chroma.sqlite3 파일
find . -type f -name "chroma.sqlite3" | while read -r FILE; do
  if [[ "$FILE" != "$KEEP1" && "$FILE" != "$KEEP2" ]]; then
    FILENAME=$(basename "$(dirname "$FILE")")_chroma.sqlite3
    echo "📦 백업 및 제거: $FILE → $BACKUP_DIR/$FILENAME"
    mv "$FILE" "$BACKUP_DIR/$FILENAME"
  else
    echo "✅ 보존됨: $FILE"
  fi
done

echo "🎉 완료: 중복된 Chroma DB 파일 정리 완료"
echo "🗂 백업된 파일 위치: $BACKUP_DIR"
