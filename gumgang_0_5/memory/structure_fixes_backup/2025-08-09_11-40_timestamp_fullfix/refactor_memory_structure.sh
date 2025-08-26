#!/bin/bash

echo "📦 금강 기억관제 리팩토링 시작..."

BASE_DIR="$(pwd)/backend/memory"

# 1. 메모리 디렉토리 재구성
mkdir -p "$BASE_DIR/vectors"
mkdir -p "$BASE_DIR/sources"
mkdir -p "$BASE_DIR/logs"

# 2. 산재한 JSON, sqlite3, 기타 기억 파일 이동
echo "📁 기억 원본 파일을 sources/로 이동 중..."
mv -v backend/data/*.json "$BASE_DIR/sources/" 2>/dev/null
mv -v backend/memory/gumgang_memory/*.json "$BASE_DIR/sources/" 2>/dev/null
mv -v backend/memory/gumgang_memory/*.sqlite3 "$BASE_DIR/sources/" 2>/dev/null
mv -v memory/gumgang_memory/*.sqlite3 "$BASE_DIR/sources/" 2>/dev/null

# 3. vectors (기존 Chroma) 이동
echo "📁 기존 Chroma 벡터 DB를 vectors/로 이동 중..."
mv -v backend/memory/gumgang_memory "$BASE_DIR/vectors/roadmap" 2>/dev/null || true
mv -v memory/gumgang_memory "$BASE_DIR/vectors/legacy" 2>/dev/null || true

# 4. 로그 디렉토리에 기록 남기기
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
echo "🔖 금강 기억 리팩토링 완료 - $DATE" >> "$BASE_DIR/logs/refactor_history.log"

echo "✅ 기억 재구성 완료: memory 폴더가 정리되었습니다."
tree "$BASE_DIR"

echo "🧠 다음 단계: scripts/auto_ingest_memory.py 실행하여 자동 인게스트 준비"
