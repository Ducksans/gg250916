#!/bin/bash
# Rules 자동 업데이트 Hook

echo "🔄 Rules 파일 자동 업데이트 시작..."
python3 /home/duksan/바탕화면/gumgang_0_5/update_rules.py

if [ $? -eq 0 ]; then
    echo "✅ Rules 업데이트 성공"
else
    echo "❌ Rules 업데이트 실패"
fi
