#!/bin/bash

# 저장 파일명
OUTPUT_FILE="debug_log_targets.txt"

# 초기화
echo "🔍 금강 디버깅 로그 포함 파일 목록" > $OUTPUT_FILE
echo "==============================" >> $OUTPUT_FILE

# 대상 폴더 제한
TARGET_DIRS=( "./backend/app" "./backend/nodes" "./backend/chains" )

# 검색 및 저장
for dir in "${TARGET_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    grep -rl 'print(' "$dir" --include="*.py" >> $OUTPUT_FILE
  fi
done

echo "✅ 디버깅 로그 추출 완료: $OUTPUT_FILE"

