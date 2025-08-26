#!/bin/bash

echo "📦 금강 백엔드 0.8 폴더 구조 리팩토링 시작..."

# 1. 중복된 memory 제거 및 통일
if [ -d "./memory/memory/gumgang_memory" ]; then
    echo "🧹 중복 memory 경로 정리 중..."
    rm -rf ./memory/memory
fi

# 2. scripts 재배치
if [ -f "./data/backend/scripts/roadmap_ingest.py" ]; then
    echo "🚚 roadmap_ingest.py 이동 중..."
    mv ./data/backend/scripts/roadmap_ingest.py ./scripts/
    rmdir ./data/backend/scripts 2>/dev/null
    rmdir ./data/backend 2>/dev/null
fi

# 3. __pycache__ 전역 제거
echo "🧹 __pycache__ 제거 중..."
find . -type d -name '__pycache__' -exec rm -rf {} +

# 4. 로그, 테스트 파일 분류
mkdir -p logs tests

# 로그 파일 이동
mv ./*_log*.txt ./logs/ 2>/dev/null
mv ./*.http ./logs/ 2>/dev/null

# 테스트 파일 이동
mv ./test_*.py ./tests/ 2>/dev/null

# 5. 전체 백업 생성
BACKUP_NAME="backend_backup_$(date +%Y%m%d_%H%M%S).zip"
echo "💾 전체 백업 생성: $BACKUP_NAME"
zip -r "./$BACKUP_NAME" . -x "*.git*" "__pycache__*" "*.DS_Store" "*.zip"

echo "✅ 리팩토링 완료!"
