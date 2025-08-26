#!/bin/bash

echo "🔧 금강 인게스트 경로 자동 정리 스크립트 시작..."
echo "📁 대상: backend/scripts/*ingest*.py"

# 백업 디렉토리 생성
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backup_ingest_scripts_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# 대상 경로들 정의
GUMGANG_PATH="backend/memory/gumgang_memory"
CHATGPT_PATH="backend/memory/vectors/chatgpt_memory"

# 순회하며 경로 수정
for file in ./scripts/*ingest*.py; do
  if [[ -f "$file" ]]; then
    echo "📝 수정 대상: $file"

    # 백업
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
    echo "  ⤷ 백업 저장: $BACKUP_DIR/$(basename "$file").bak"

    # 내부 경로 수정
    sed -i \
      -e "s|memory/gumgang_memory|$GUMGANG_PATH|g" \
      -e "s|\"gumgang_memory\"|\"$GUMGANG_PATH\"|g" \
      -e "s|\"chatgpt_memory\"|\"$CHATGPT_PATH\"|g" \
      "$file"

    echo "  ✅ 경로 수정 완료"
  fi
done

echo ""
echo "🎉 모든 ingest 스크립트 경로 정리 완료!"
echo "🗂 백업된 파일들은: $BACKUP_DIR"
