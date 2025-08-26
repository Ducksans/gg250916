#!/bin/bash

# 경로 설정
BACKEND_DIR="$HOME/바탕화면/gumgang_0_5/backend"
FRONTEND_DIR="$HOME/바탕화면/gumgang_0_5/frontend"

# 백엔드 실행 (터미널 새 창)
gnome-terminal -- bash -c "
  echo '[금강] 백엔드 서버 실행 중...';
  cd $BACKEND_DIR;
  uvicorn main:app --reload;
  exec bash"

# 프론트엔드 실행 (터미널 새 창)
gnome-terminal -- bash -c "
  echo '[금강] 프론트엔드 서버 실행 중...';
  cd $FRONTEND_DIR;
  npm run dev;
  exec bash"
