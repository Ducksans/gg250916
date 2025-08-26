#!/bin/bash

# Source time utilities for KST timestamps
source $(dirname "$0")/scripts/time_kr.sh 2>/dev/null || source scripts/time_kr.sh 2>/dev/null || true

# 📅 현재 시각 기준 타임스탬프 생성
TIMESTAMP=$(format_for_filename_compact)

# 📁 백업 대상 루트
TARGET_DIR=~/바탕화면/gumgang_0_5
BACKUP_NAME="gumgang_backup_$TIMESTAMP.zip"
DEST_DIR=~/바탕화면

echo "📦 금강 백업 시작: $BACKUP_NAME"

# ✅ 백업 실행
zip -r "$DEST_DIR/$BACKUP_NAME" "$TARGET_DIR" -x "*.pyc" -x "__pycache__/*" -x "memory/*" -x "*.log"

echo "✅ 백업 완료: $DEST_DIR/$BACKUP_NAME"
