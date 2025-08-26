#!/bin/bash
# 📦 금강 프로젝트 로컬 백업 스크립트 (v0.8)

cd ~/바탕화면
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_name="gumgang_backup_${timestamp}.zip"

echo "📦 금강 프로젝트를 백업 중입니다..."
zip -r "$backup_name" gumgang_0_5 -x "*.venv/*" "*.env" "__pycache__/*" "node_modules/*" "*.zip"
echo "✅ 로컬 백업 완료: $backup_name"
