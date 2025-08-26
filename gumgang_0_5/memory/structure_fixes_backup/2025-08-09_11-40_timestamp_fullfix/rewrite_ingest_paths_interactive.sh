#!/bin/bash

echo "🔧 [대화형] 금강 인게스트 경로 정리 스크립트 시작..."
echo "📁 대상: backend/scripts/*ingest*.py"

# 백업 디렉토리 생성
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backend/backup_ingest_scripts_$TIMESTAMP"
TARGET_DIR="./backend/scripts"
mkdir -p "$BACKUP_DIR"

# 대상 경로들 정의
GUMGANG_PATH="backend/memory/gumgang_memory"
CHATGPT_PATH="backend/memory/vectors/chatgpt_memory"

for file in "$TARGET_DIR"/*ingest*.py; do
  if [[ -f "$file" ]]; then
    echo -e "\n📝 수정 대상 파일: $file"
    read -p "👉 이 파일을 수정할까요? [y/n] " -n 1 -r
    echo    # 줄바꿈

    if [[ $REPLY =~ ^[Yy]$ ]]; then
      cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
      echo "  📦 백업 저장됨: $BACKUP_DIR/$(basename "$file").bak"

      sed -i \
        -e "s|memory/gumgang_memory|$GUMGANG_PATH|g" \
        -e "s|\"gumgang_memory\"|\"$GUMGANG_PATH\"|g" \
        -e "s|\"chatgpt_memory\"|\"$CHATGPT_PATH\"|g" \
        "$file"

      echo "  ✅ 경로 수정 완료"
    else
      echo "  ❌ 건너뜀"
    fi
  fi
done

echo ""
echo "🎉 모든 ingest 스크립트 순회 완료!"
echo "🗂 백업된 파일 위치: $BACKUP_DIR"
