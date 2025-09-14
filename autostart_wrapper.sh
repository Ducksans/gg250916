#!/bin/bash
# 자동 시작 환경의 문제를 해결하기 위한 래퍼 스크립트
# 상세 로그: $HOME/gumgang_autostart_log.txt

# 사용자 환경 변수(nvm 등)를 명시적으로 로드합니다.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 프로젝트 디렉토리로 이동합니다.
cd '/home/duksan/바탕화면/gumgang_meeting'

# tmux 세션을 시작하고, 모든 출력을 로그 파일로 리디렉션합니다.
tmux start-server
tmux new-session -d -s gumgang './scripts/dev_all.sh' &> "$HOME/gumgang_autostart_log.txt"
