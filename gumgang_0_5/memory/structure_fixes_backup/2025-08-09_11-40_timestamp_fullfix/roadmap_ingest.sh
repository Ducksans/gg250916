#!/bin/bash

echo "📦 금강 로드맵 인게스트 자동화 시작..."

# 1단계: JSON 파일 복사
SRC_JSON="./frontend/public/roadmap.json"
DEST_JSON="./backend/data/roadmap_gold.json"

if [ -f "$SRC_JSON" ]; then
    cp "$SRC_JSON" "$DEST_JSON"
    echo "✅ roadmap.json 파일 복사 완료 → $DEST_JSON"
else
    echo "❌ roadmap.json 파일을 찾을 수 없습니다: $SRC_JSON"
    exit 1
fi

# 2단계: roadmap_ingest.py 실행
INGEST_SCRIPT="./backend/data/scripts/roadmap_ingest.py"  # ✅ 정확한 경로 및 파일명

if [ -f "$INGEST_SCRIPT" ]; then
    echo "🚀 인게스트 스크립트 실행 중..."
    python3 "$INGEST_SCRIPT"
    echo "✅ 인게스트 스크립트 실행 완료"
else
    echo "❌ roadmap_ingest.py 파일이 없습니다: $INGEST_SCRIPT"
    exit 1
fi

echo "🎉 금강 로드맵 인게스트 완료!"
