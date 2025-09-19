#!/bin/bash

# 🚀 Gumgang 2.0 서버 시작 스크립트

# 백엔드 서버 시작
cd /home/duksan/바탕화면/gumgang_meeting/gumgang_0_5/backend
python simple_main.py &

# 프론트엔드 서버 시작
cd /home/duksan/바탕화면/gumgang_meeting/gumgang_0_5/gumgang-v2
npm run dev &

# 터미널 서버 시작 (선택)
# cd /home/duksan/바탕화면/gumgang_meeting/gumgang_0_5
# python terminal_server.py &

echo "서버 시작 완료!"
echo "백엔드: http://localhost:8000"
echo "프론트엔드: http://localhost:3000"
